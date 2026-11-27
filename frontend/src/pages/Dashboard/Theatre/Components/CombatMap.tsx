import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createBattleMap, getBattleMap, getBattleMaps, updateBattleMap } from '../../../../api/backendHelpers';
import BattleMapView, { type MapToken } from '../../../../battlemap/BattleMapView';
import { generateFromRecipe, generateMap, type Biome, type MapRecipe } from '../../../../battlemap/generate';
import { cellKey, geometry, type Cell, type GridType } from '../../../../battlemap/grid';
import { codeAt, inBounds, type BattleMap } from '../../../../battlemap/map';
import { autoPlace } from '../../../../battlemap/place';
import { useWheelZoom } from '../../../../battlemap/useWheelZoom';
import { coverBetween, findPath, moveCost, passable } from '../../../../battlemap/rules';
import { terrain } from '../../../../battlemap/terrain';
import { rollExpression } from './dice';
import DungeonHelper from './DungeonHelper';
import type { CombatMapRef, Combatant } from './types';

interface Props {
  campaignId: string | null;
  sessionId: string | null;
  mapRef: CombatMapRef | null;
  combatants: Combatant[];
  turn: number;
  selectedId: string | null;
  /** Art and a one-line description per combatant, when known. */
  looks?: Record<string, { imageUrl?: string; subtitle?: string }>;
  onSelect: (id: string | null) => void;
  /** Switch maps; positions given are applied in the same update. */
  onSetMap: (ref: CombatMapRef | null, positions?: Record<string, Cell | null>) => void;
  onPlace: (positions: Record<string, Cell | null>) => void;
  onApplyHp: (id: string, delta: number) => void;
  /** A quick map was made for this fight (so the session notes can record it). */
  onQuickMap?: (ref: CombatMapRef) => void;
}

interface Hazard {
  key: string;
  combatantId: string;
  name: string;
  kind: 'pit' | 'fire' | 'trap';
  cell: Cell;
  why: 'enter' | 'turn';
  result?: string;
}

const PREFS_KEY = 'twinsoul.quickmap';

/** Short token label: "Wolf 2" → "W2", "Lyra" → "Ly". */
export function tokenLabel(name: string): string {
  const words = name.trim().split(/\s+/);
  const n = words[words.length - 1].match(/^\d+$/)?.[0];
  if (n) return `${words[0][0] ?? '?'}${n}`.toUpperCase().slice(0, 3);
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : (words[0].slice(0, 2) || '?');
}

const COVER_TEXT: Record<string, string> = { 0: 'no cover', 2: 'half cover (+2 AC)', 5: 'three-quarters cover (+5 AC)', total: 'total cover — can’t be targeted directly' };

function loadPrefs(): { grid: GridType } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return { grid: p.grid === 'hex' ? 'hex' : 'square' };
  } catch { return { grid: 'square' }; }
}

// The battle map inside the Combat tab: pick or generate a map, then move
// everyone in the tracker around on it, with the map's rules as hints.
export default function CombatMap(p: Props) {
  const { combatants, turn, selectedId, mapRef } = p;
  const [map, setMap] = useState<BattleMap | null>(null);
  const [loadError, setLoadError] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState<BattleMap[] | null>(null);
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [drag, setDrag] = useState<{ id: string; from: Cell; to: Cell } | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  // Where the pointer is inside the map, for placing the hover card.
  const [pointer, setPointer] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ⌘/Ctrl + scroll (or pinch) zooms around the cursor; zooming out past the fitted size snaps back to Fit.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [naturalW, naturalH] = map ? geometry(map.grid).size(map.width, map.height) : [1, 1];
  useWheelZoom(canvasRef, {
    naturalWidth: naturalW,
    min: 0.3,
    max: 3,
    enabled: !!map && !picking,
    onZoom: (scale) => {
      const el = canvasRef.current;
      const fit = el ? Math.min(el.clientWidth / naturalW, el.clientHeight / naturalH) : 0;
      setZoom(scale <= fit * 1.02 ? 'fit' : scale);
    },
  });

  const updatePrefs = (patch: Partial<typeof prefs>) => setPrefs((prev) => {
    const next = { ...prev, ...patch };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });

  // Load the fight's map; reload when the DM comes back from editing it in another tab.
  const loadMap = useCallback(() => {
    if (!mapRef) { setMap(null); return; }
    getBattleMap(mapRef.id)
      .then((r) => { setMap({ ...r.data, props: r.data.props ?? {}, settings: r.data.settings ?? {} }); setLoadError(''); })
      .catch(() => setLoadError('This map couldn’t be loaded — it may have been deleted.'));
  }, [mapRef]);
  useEffect(loadMap, [loadMap]);
  useEffect(() => {
    if (!mapRef) return undefined;
    const onFocus = () => loadMap();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [mapRef, loadMap]);

  // Saved maps for the picker: this session's first, then the library.
  useEffect(() => {
    if (!p.campaignId || (mapRef && !picking)) return;
    let alive = true;
    getBattleMaps(p.campaignId)
      .then((r) => {
        if (!alive) return;
        const list: BattleMap[] = r.data;
        setSaved([...list.filter((m) => m.session_id && m.session_id === p.sessionId), ...list.filter((m) => !m.session_id)]);
      })
      .catch(() => { if (alive) setSaved([]); });
    return () => { alive = false; };
  }, [p.campaignId, p.sessionId, mapRef, picking]);

  const placeEveryone = useCallback((m: BattleMap, keep: boolean) => autoPlace(m, combatants.map((c) => ({
    id: c.id, enemy: !!c.isEnemy, pos: keep && c.pos && inBounds(m, ...c.pos) && passable(m, ...c.pos) ? c.pos : null,
  }))), [combatants]);

  const openMap = async (m: BattleMap) => {
    // Opening a saved map loads the full grid first, then places everyone.
    const full = m.cells?.length ? m : (await getBattleMap(m.id!)).data as BattleMap;
    const ready = { ...full, props: full.props ?? {}, settings: full.settings ?? {} };
    setMap(ready);
    setPicking(false);
    p.onSetMap({ id: ready.id!, name: ready.name }, placeEveryone(ready, false));
  };

  // The helper's map becomes this fight's map: saved to the session, everyone placed.
  const createAndUse = async (gen: BattleMap) => {
    if (!p.campaignId || busy) return;
    setBusy('create');
    try {
      const res = await createBattleMap(p.campaignId, { ...gen, session_id: p.sessionId ?? undefined });
      const made: BattleMap = { ...res.data, props: res.data.props ?? {}, settings: res.data.settings ?? {} };
      setMap(made);
      setPicking(false);
      const ref = { id: made.id!, name: made.name };
      p.onSetMap(ref, placeEveryone(made, false));
      p.onQuickMap?.(ref);
    } catch {
      setLoadError('Couldn’t save the map. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const reroll = async () => {
    if (!map?.id || !map.settings.quick || busy) return;
    setBusy('reroll');
    try {
      const q = map.settings.quick;
      const seed = Math.floor(Math.random() * 1e9);
      const recipe = map.settings.recipe as Omit<MapRecipe, 'seed'> | undefined;
      const gen = recipe
        ? generateFromRecipe({ ...recipe, grid: map.grid, width: map.width, height: map.height, seed })
        : generateMap({ biome: q.biome as Biome, grid: map.grid, width: map.width, height: map.height, obstacles: q.obstacles, hazards: q.hazards, lighting: map.lighting, seed });
      await updateBattleMap(map.id, { cells: gen.cells, props: gen.props, lighting: gen.lighting, settings: gen.settings });
      const next = { ...map, cells: gen.cells, props: gen.props, lighting: gen.lighting, settings: gen.settings };
      setMap(next);
      p.onPlace(placeEveryone(next, false));
    } finally {
      setBusy(null);
    }
  };

  // Newcomers (an encounter started, someone added) land on the map by themselves.
  const placed = useRef(new Set<string>());
  useEffect(() => {
    if (!map) return;
    const missing = combatants.filter((c) => !c.pos && !placed.current.has(c.id));
    combatants.forEach((c) => placed.current.add(c.id));
    if (missing.length) {
      const spots = placeEveryone(map, true);
      const only = Object.fromEntries(Object.entries(spots).filter(([id]) => missing.some((c) => c.id === id)));
      if (Object.keys(only).length) p.onPlace(only);
    }
  }, [combatants, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // A creature starting its turn in fire gets a prompt.
  const current = combatants[turn];
  useEffect(() => {
    if (!map || !current?.pos) return;
    const t = terrain(codeAt(map, ...current.pos));
    if (t.hazard === 'fire') {
      setHazards((h) => [...h, { key: `${current.id}-turn-${Date.now()}`, combatantId: current.id, name: current.name, kind: 'fire', cell: current.pos!, why: 'turn' }]);
    }
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const byCell = useMemo(() => {
    const m = new Map<string, Combatant>();
    combatants.forEach((c) => c.pos && m.set(cellKey(...c.pos), c));
    return m;
  }, [combatants]);

  const pathInfo = useMemo(() => {
    if (!map || !drag || (drag.to[0] === drag.from[0] && drag.to[1] === drag.from[1])) return null;
    const blocked = new Set(Array.from(byCell.keys()).filter((k) => k !== cellKey(...drag.from)));
    const path = findPath(map, drag.from, drag.to, blocked);
    if (!path) return { path: null, label: 'Can’t go there' };
    const cost = moveCost(map, path);
    return { path, cost, label: `${cost.feet} ft${cost.difficult ? ` · ${cost.difficult} difficult` : ''}${cost.hazards.length ? ' · ⚠' : ''}` };
  }, [map, drag, byCell]);

  const selected = combatants.find((c) => c.id === selectedId);
  const hovered = hover ? byCell.get(cellKey(...hover)) : undefined;
  const status = useMemo(() => {
    if (!map) return '';
    if (armed) return `Click a square to place ${combatants.find((c) => c.id === armed)?.name ?? 'them'}.`;
    if (drag && pathInfo) return pathInfo.label === 'Can’t go there' ? 'Can’t go there.' : `Moving: ${pathInfo.label}`;
    if (selected?.pos && hovered?.pos && hovered.id !== selected.id) {
      const g = geometry(map.grid);
      const others = combatants.filter((c) => c.pos && c.id !== selected.id && c.id !== hovered.id).map((c) => c.pos!) as Cell[];
      const cover = coverBetween(map, selected.pos, hovered.pos, others);
      return `${selected.name} → ${hovered.name}: ${g.steps(selected.pos, hovered.pos) * 5} ft, ${COVER_TEXT[String(cover)]}.`;
    }
    if (hover && inBounds(map, ...hover)) {
      const t = terrain(codeAt(map, ...hover));
      return `${t.name}${t.code === '^' ? ' (hidden from players)' : ''}: ${t.rule}`;
    }
    return selected ? `${selected.name} selected. Hover another creature to check distance and cover.` : 'Drag a token to move it, click one to select it. ⌘/Ctrl + scroll to zoom.';
  }, [map, armed, drag, pathInfo, selected, hovered, hover, combatants]);

  if (!mapRef || picking) {
    return (
      <section className="theatre__cmap theatre__cmap--pick" aria-label="Battle map">
        <div className="theatre__cmap-pick">
          <DungeonHelper
            key={mapRef ? 'change' : 'new'}
            defaultGrid={prefs.grid}
            onGridChange={(grid) => updatePrefs({ grid })}
            changing={!!mapRef}
            busy={busy === 'create'}
            onUse={createAndUse}
            onCancel={mapRef ? () => setPicking(false) : undefined}
          />
          {loadError && <p className="theatre__cmap-error">{loadError}</p>}
          <h4>Or use a saved map</h4>
          {saved === null ? <p className="theatre__cmap-muted">Loading…</p> : saved.length === 0 ? (
            <p className="theatre__cmap-muted">None yet. Build maps under <a href="/dashboard/maps" target="_blank" rel="noreferrer">Battle maps</a>.</p>
          ) : (
            <div className="theatre__cmap-saved">
              {saved.slice(0, 12).map((m) => (
                <button key={m.id} type="button" className="theatre__cmap-thumb" onClick={() => openMap(m)}>
                  <span className="theatre__cmap-thumb-img"><BattleMapView map={{ ...m, props: m.props ?? {}, settings: m.settings ?? {} }} fit showGrid={false} /></span>
                  <strong>{m.name}</strong>
                  <small>{m.session_id ? 'This session · ' : ''}{m.grid === 'hex' ? 'Hex' : 'Square'} {m.width}×{m.height}</small>
                </button>
              ))}
            </div>
          )}
          {!mapRef && <p className="theatre__cmap-muted">Or just keep going without one — the tracker works the same.</p>}
        </div>
      </section>
    );
  }

  if (!map) {
    return (
      <section className="theatre__cmap" aria-label="Battle map">
        <div className="theatre__cmap-loading">
          {loadError ? <>{loadError} <button type="button" className="theatre__btn theatre__btn--ghost" onClick={() => p.onSetMap(null)}>Remove map</button></> : 'Loading map…'}
        </div>
      </section>
    );
  }

  const unplaced = combatants.filter((c) => !c.pos || !inBounds(map, ...c.pos));
  const tokens: MapToken[] = combatants.filter((c) => c.pos && inBounds(map, ...c.pos)).map((c) => ({
    id: c.id,
    x: drag?.id === c.id ? drag.to[0] : c.pos![0],
    y: drag?.id === c.id ? drag.to[1] : c.pos![1],
    label: tokenLabel(c.name),
    kind: c.characterId ? 'pc' : c.isEnemy ? 'enemy' : 'npc',
    hidden: !!c.isEnemy && !c.revealed,
    active: combatants[turn]?.id === c.id,
    selected: c.id === selectedId,
    hp: c.maxHp > 0 ? c.hp / c.maxHp : undefined,
    down: c.maxHp > 0 && c.hp === 0,
    imageUrl: p.looks?.[c.id]?.imageUrl,
    badge: c.name.trim().match(/\s(\d+)$/)?.[1],
  }));

  const onDown = (cell: Cell) => {
    if (!inBounds(map, ...cell)) return;
    if (armed) {
      if (passable(map, ...cell) && !byCell.has(cellKey(...cell))) { p.onPlace({ [armed]: cell }); setArmed(null); }
      return;
    }
    const who = byCell.get(cellKey(...cell));
    if (who) { p.onSelect(who.id); setDrag({ id: who.id, from: cell, to: cell }); } else p.onSelect(null);
  };
  const onMove = (cell: Cell) => {
    setHover(inBounds(map, ...cell) ? cell : null);
    if (drag && inBounds(map, ...cell) && (cell[0] !== drag.to[0] || cell[1] !== drag.to[1])) setDrag({ ...drag, to: cell });
  };
  const onUp = (cell: Cell) => {
    if (!drag) return;
    const to = inBounds(map, ...cell) ? cell : drag.to;
    const moved = to[0] !== drag.from[0] || to[1] !== drag.from[1];
    if (moved) {
      const blocked = new Set(Array.from(byCell.keys()).filter((k) => k !== cellKey(...drag.from)));
      const path = findPath(map, drag.from, to, blocked);
      if (path) {
        p.onPlace({ [drag.id]: to });
        const who = combatants.find((c) => c.id === drag.id);
        const found = moveCost(map, path).hazards.map((h, i) => ({ key: `${drag.id}-${Date.now()}-${i}`, combatantId: drag.id, name: who?.name ?? 'Someone', kind: h.kind, cell: h.cell, why: 'enter' as const }));
        if (found.length) setHazards((prev) => [...prev, ...found]);
      }
    }
    setDrag(null);
  };

  const resolve = (h: Hazard, expr: string | null) => {
    if (!expr) { setHazards((prev) => prev.filter((x) => x.key !== h.key)); return; }
    const roll = rollExpression(expr);
    const dmg = roll?.total ?? 0;
    p.onApplyHp(h.combatantId, -dmg);
    setHazards((prev) => prev.map((x) => (x.key === h.key ? { ...x, result: `${h.name} takes ${dmg} (${expr})` } : x)));
    setTimeout(() => setHazards((prev) => prev.filter((x) => x.key !== h.key)), 3500);
  };

  const hazardDice = (h: Hazard) => {
    const props = map.props[cellKey(...h.cell)] ?? {};
    if (h.kind === 'pit') { const n = Math.max(1, Math.floor((props.depth ?? 10) / 10)); return `${n}d6`; }
    if (h.kind === 'fire') return props.damage ?? '1d10';
    return null;
  };

  return (
    <section className="theatre__cmap" aria-label={`Battle map: ${map.name}`}>
      <div className="theatre__cmap-bar">
        <strong className="theatre__cmap-name" title={map.name}>🗺 {map.name}</strong>
        <span className="theatre__cmap-muted">{map.grid === 'hex' ? 'Hex' : 'Square'} {map.width}×{map.height}{map.lighting !== 'bright' ? ` · ${map.lighting === 'dim' ? 'dim' : 'dark'}` : ''}</span>
        <span className="theatre__cmap-spacer" />
        {map.settings.quick && <button type="button" className="theatre__mini" onClick={reroll} disabled={!!busy} title="Same kind of place, new layout; everyone is placed again">↻ Reroll</button>}
        <button type="button" className="theatre__mini" onClick={() => setPicking(true)}>Change</button>
        <a className="theatre__mini" href={`/dashboard/maps/${map.id}`} target="_blank" rel="noreferrer" title="Edit in the builder (new tab); changes show up here when you come back">Edit ↗</a>
        <span className="theatre__seg theatre__seg--sm" role="group" aria-label="Zoom">
          <button type="button" className={zoom === 'fit' ? 'is-on' : ''} onClick={() => setZoom('fit')}>Fit</button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.6, (z === 'fit' ? 1 : z) - 0.25))} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(3, (z === 'fit' ? 1 : z) + 0.25))} aria-label="Zoom in">＋</button>
        </span>
        <button type="button" className="theatre__mini" onClick={() => p.onSetMap(null, Object.fromEntries(combatants.map((c) => [c.id, null])))} title="Fight without a map">✕</button>
      </div>

      {unplaced.length > 0 && (
        <div className="theatre__cmap-unplaced" role="group" aria-label="Not on the map yet">
          <span>Not on the map:</span>
          {unplaced.map((c) => (
            <button key={c.id} type="button" className={`theatre__chip ${armed === c.id ? 'is-on' : ''} ${c.isEnemy ? 'is-enemy' : ''}`} aria-pressed={armed === c.id} onClick={() => setArmed(armed === c.id ? null : c.id)}>
              {c.name}
            </button>
          ))}
          <button type="button" className="theatre__mini" onClick={() => { p.onPlace(placeEveryone(map, true)); setArmed(null); }}>Place all</button>
        </div>
      )}

      <div
        ref={canvasRef}
        className={`theatre__cmap-canvas ${zoom === 'fit' ? 'is-fit' : ''}`}
        onPointerLeave={() => { setHover(null); setPointer(null); }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPointer({ x: e.clientX - r.left + e.currentTarget.scrollLeft, y: e.clientY - r.top + e.currentTarget.scrollTop, w: r.width, h: r.height });
        }}
      >
        <BattleMapView
          map={map}
          fit={zoom === 'fit'}
          zoom={zoom === 'fit' ? 1 : zoom}
          tokens={tokens}
          path={pathInfo?.path ?? undefined}
          pathLabel={pathInfo?.label}
          preview={armed && hover && passable(map, ...hover) && !byCell.has(cellKey(...hover)) ? [hover] : undefined}
          onCellDown={onDown}
          onCellMove={onMove}
          onCellUp={onUp}
          title={map.name}
        />
        {hovered && pointer && !drag && !armed && (
          <TokenCard
            c={hovered}
            look={p.looks?.[hovered.id]}
            isTurn={combatants[turn]?.id === hovered.id}
            from={selected && selected.id !== hovered.id && selected.pos && hovered.pos ? {
              name: selected.name,
              feet: geometry(map.grid).steps(selected.pos, hovered.pos) * 5,
              cover: coverBetween(map, selected.pos, hovered.pos, combatants.filter((c) => c.pos && c.id !== selected.id && c.id !== hovered.id).map((c) => c.pos!) as Cell[]),
            } : null}
            style={{
              left: pointer.x + 270 > pointer.w ? Math.max(4, pointer.x - 262) : pointer.x + 16,
              top: pointer.y + 190 > pointer.h ? Math.max(4, pointer.y - 180) : pointer.y + 16,
            }}
          />
        )}
        {hazards.length > 0 && (
          <div className="theatre__cmap-hazards" role="status">
            {hazards.slice(-3).map((h) => {
              const dice = hazardDice(h);
              const props = map.props[cellKey(...h.cell)] ?? {};
              return (
                <div key={h.key} className={`theatre__cmap-hazard theatre__cmap-hazard--${h.kind}`}>
                  {h.result ? <span>{h.result}.</span> : (
                    <>
                      <span>
                        {h.kind === 'pit' && <><b>{h.name}</b> falls into a pit ({props.depth ?? 10} ft).</>}
                        {h.kind === 'fire' && <><b>{h.name}</b> {h.why === 'turn' ? 'starts their turn in' : 'moves into'} fire.</>}
                        {h.kind === 'trap' && <><b>{h.name}</b> steps on a trap{props.effect ? `: ${props.effect}` : ''}{props.spotDc ? ` (spot DC ${props.spotDc})` : ''}.</>}
                      </span>
                      <span className="theatre__cmap-hazard-acts">
                        {dice && <button type="button" className="theatre__mini" onClick={() => resolve(h, dice)}>Roll {dice}</button>}
                        {h.kind === 'pit' && <button type="button" className="theatre__mini" onClick={() => resolve(h, null)}>Caught the edge</button>}
                        <button type="button" className="theatre__mini" onClick={() => resolve(h, null)}>{h.kind === 'trap' ? 'Got it' : 'Ignore'}</button>
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="theatre__cmap-status" aria-live="polite">{status}</div>
    </section>
  );
}

const COVER_SHORT: Record<string, string> = { 0: 'no cover', 2: '½ cover (+2)', 5: '¾ cover (+5)', total: 'total cover' };

// The little card shown when hovering a token: who it is, how they're doing,
// and (if another token is selected) how far away and how covered they are.
function TokenCard({ c, look, isTurn, from, style }: {
  c: Combatant;
  look?: { imageUrl?: string; subtitle?: string };
  isTurn: boolean;
  from: { name: string; feet: number; cover: 0 | 2 | 5 | 'total' } | null;
  style: CSSProperties;
}) {
  const kind = c.characterId ? 'pc' : c.isEnemy ? 'enemy' : 'ally';
  const down = c.maxHp > 0 && c.hp === 0;
  const pct = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : null;
  const hpClass = pct === null ? '' : pct > 0.5 ? 'is-good' : pct > 0.25 ? 'is-mid' : 'is-low';
  return (
    <div className={`theatre__tokcard is-${kind}`} style={style} role="tooltip">
      <div className="theatre__tokcard-head">
        <span className="theatre__tokcard-art" style={look?.imageUrl ? { backgroundImage: `url(${look.imageUrl})` } : undefined} aria-hidden="true">
          {!look?.imageUrl && (c.name[0]?.toUpperCase() ?? '?')}
        </span>
        <div className="theatre__tokcard-title">
          <strong>{c.name}</strong>
          <small>{look?.subtitle || (kind === 'pc' ? 'Player character' : kind === 'enemy' ? 'Enemy' : 'Ally')}</small>
        </div>
      </div>
      {c.maxHp > 0 && (
        <div className="theatre__tokcard-hp">
          <div className="theatre__tokcard-bar"><i className={hpClass} style={{ width: `${(pct ?? 0) * 100}%` }} /></div>
          <span>{down ? (kind === 'enemy' ? '💀 Dead' : '❤ Dying — death saves') : `${c.hp}/${c.maxHp}`}{c.tempHp ? ` +${c.tempHp}` : ''}</span>
        </div>
      )}
      <div className="theatre__tokcard-stats">
        {c.armorClass != null && <span><em>AC</em> {c.armorClass}</span>}
        <span><em>Init</em> {c.init}</span>
        {isTurn && <span className="is-turn">▶ Their turn</span>}
        {kind === 'enemy' && !c.revealed && <span className="is-hidden">Hidden from players</span>}
      </div>
      {(c.conditions?.length || c.exhaustion) ? (
        <div className="theatre__tokcard-conds">
          {c.conditions?.map((x) => <span key={x}>{x}</span>)}
          {c.exhaustion ? <span>Exhaustion {c.exhaustion}</span> : null}
        </div>
      ) : null}
      {from && <div className="theatre__tokcard-from">{from.feet} ft from {from.name} · {COVER_SHORT[String(from.cover)]}</div>}
    </div>
  );
}
