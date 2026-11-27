import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBattleMap, updateBattleMap } from '../../../api/backendHelpers';
import BattleMapView from '../../../battlemap/BattleMapView';
import { cellKey, geometry, type Cell } from '../../../battlemap/grid';
import {
  brush, codeAt, fillArea, inBounds, line, paint, rect, resize, room, setProps, MAX_HEIGHT, MAX_WIDTH, MIN_SIZE,
  type BattleMap, type Lighting,
} from '../../../battlemap/map';
import { vision, type Viewer } from '../../../battlemap/rules';
import { useWheelZoom } from '../../../battlemap/useWheelZoom';
import { GROUP_LABEL, TERRAIN, terrain, type CellProps, type TerrainCode, type TerrainGroup } from '../../../battlemap/terrain';
import '../../../styles/battleMap.css';

type Tool = 'select' | 'paint' | 'line' | 'room' | 'fill' | 'erase' | 'viewer';

const TOOLS: { tool: Tool; label: string; icon: string; hint: string }[] = [
  { tool: 'select', label: 'Select', icon: '➤', hint: 'Click a square to see its rule and settings' },
  { tool: 'paint', label: 'Paint', icon: '✎', hint: 'Click or drag to paint the chosen terrain' },
  { tool: 'line', label: 'Line', icon: '╱', hint: 'Drag a straight line: walls, rivers, roads' },
  { tool: 'room', label: 'Room', icon: '▭', hint: 'Drag a rectangle: floor with walls around it' },
  { tool: 'fill', label: 'Fill', icon: '◧', hint: 'Fill a connected area with the chosen terrain' },
  { tool: 'erase', label: 'Erase', icon: '⌫', hint: 'Turn squares back into plain ground' },
];
const GROUPS: TerrainGroup[] = ['ground', 'movement', 'walls', 'hazards'];
const MAX_UNDO = 100;

// The swatch for a terrain code: a one-cell map.
function Swatch({ code, size = 22 }: { code: TerrainCode; size?: number }) {
  const m = useMemo<BattleMap>(() => ({ name: '', grid: 'square', width: 1, height: 1, cells: [code], props: {}, lighting: 'bright', settings: {} }), [code]);
  return <span className="bm-swatch" style={{ width: size, height: size }}><BattleMapView map={m} fit showGrid={false} /></span>;
}

const mostCommonGround = (m: BattleMap): TerrainCode => {
  const counts: Record<string, number> = {};
  m.cells.forEach((r) => r.split('').forEach((c) => { if ('g.sd'.includes(c)) counts[c] = (counts[c] ?? 0) + 1; }));
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as TerrainCode) ?? 'g';
};

export default function BattleMapBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = useState<BattleMap | null>(null);
  const [error, setError] = useState('');
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [tool, setTool] = useState<Tool>('paint');
  const [code, setCode] = useState<TerrainCode>('#');
  const [size, setSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [drag, setDrag] = useState<{ start: Cell; end: Cell } | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [resizeTo, setResizeTo] = useState<{ w: number; h: number } | null>(null);
  // Vision preview: a test viewer you drop on the map.
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerSense, setViewerSense] = useState<'none' | 'torch' | 'dark60' | 'dark120'>('torch');

  const undo = useRef<BattleMap[]>([]);
  const redo = useRef<BattleMap[]>([]);
  const painting = useRef(false);
  const dirty = useRef(false);
  const mapRef = useRef<BattleMap | null>(null);
  mapRef.current = map;

  useEffect(() => {
    if (!id) return;
    getBattleMap(id)
      .then((r) => setMap({ ...r.data, props: r.data.props ?? {}, settings: r.data.settings ?? {} }))
      .catch(() => setError('Could not load this map.'));
  }, [id]);

  // Autosave shortly after the last change.
  useEffect(() => {
    if (!map || !dirty.current || !id) return;
    setSave('saving');
    const t = setTimeout(() => {
      dirty.current = false;
      const { name, cells, props, lighting, settings, width, height } = map;
      updateBattleMap(id, { name: name.trim() || 'Untitled map', cells, props, lighting, settings, width, height })
        .then(() => setSave('saved'))
        .catch(() => { setSave('error'); dirty.current = true; });
    }, 700);
    return () => clearTimeout(t);
  }, [map, id]);

  const change = useCallback((next: BattleMap, pushUndo = true) => {
    const prev = mapRef.current;
    if (!prev || next === prev) return;
    if (pushUndo) {
      undo.current.push(prev);
      if (undo.current.length > MAX_UNDO) undo.current.shift();
      redo.current = [];
    }
    dirty.current = true;
    setMap(next);
  }, []);

  const doUndo = useCallback(() => {
    const prev = undo.current.pop();
    if (!prev || !mapRef.current) return;
    redo.current.push(mapRef.current);
    dirty.current = true;
    setMap(prev);
  }, []);
  const doRedo = useCallback(() => {
    const next = redo.current.pop();
    if (!next || !mapRef.current) return;
    undo.current.push(mapRef.current);
    dirty.current = true;
    setMap(next);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select');
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
      if (e.key === 'Escape') { setDrag(null); setSelected(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doUndo, doRedo]);

  const eraseCode = useMemo(() => (map ? mostCommonGround(map) : 'g'), [map]);

  const preview = useMemo<Cell[] | undefined>(() => {
    if (!map) return undefined;
    if (drag && tool === 'line') return line(map, drag.start, drag.end);
    if (drag && tool === 'room') {
      const { x0, y0, x1, y1 } = rect(drag.start, drag.end);
      const out: Cell[] = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inBounds(map, x, y)) out.push([x, y]);
      return out;
    }
    if (hover && (tool === 'paint' || tool === 'erase')) return brush(map, hover, size);
    return undefined;
  }, [map, drag, tool, hover, size]);

  const viewerFull = useMemo<Viewer | null>(() => {
    if (!viewer) return null;
    if (viewerSense === 'torch') return { ...viewer, light: { bright: 20, dim: 20 } };
    if (viewerSense === 'dark60') return { ...viewer, darkvision: 60 };
    if (viewerSense === 'dark120') return { ...viewer, darkvision: 120 };
    return viewer;
  }, [viewer, viewerSense]);
  const seen = useMemo(() => (map && viewerFull ? vision(map, [viewerFull]) : undefined), [map, viewerFull]);

  // ⌘/Ctrl + scroll (or pinch) zooms around the cursor.
  const canvasRef = useRef<HTMLDivElement>(null);
  useWheelZoom(canvasRef, {
    naturalWidth: map ? geometry(map.grid).size(map.width, map.height)[0] : 1,
    min: 0.4,
    max: 3,
    enabled: !!map,
    onZoom: (scale) => setZoom(+scale.toFixed(2)),
  });

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!map) return <p className="text-muted-theme">Loading…</p>;

  const onDown = (c: Cell) => {
    if (!inBounds(map, ...c)) return;
    if (tool === 'select') { setSelected(c); return; }
    if (tool === 'viewer') { setViewer({ x: c[0], y: c[1] }); return; }
    if (tool === 'fill') { change(paint(map, fillArea(map, c), code)); return; }
    if (tool === 'line' || tool === 'room') { setDrag({ start: c, end: c }); return; }
    painting.current = true;
    change(paint(map, brush(map, c, size), tool === 'erase' ? eraseCode : code));
  };
  const onMove = (c: Cell, e: React.PointerEvent) => {
    setHover(inBounds(map, ...c) ? c : null);
    if (drag && (c[0] !== drag.end[0] || c[1] !== drag.end[1])) setDrag({ ...drag, end: c });
    if (painting.current && e.buttons & 1 && inBounds(map, ...c)) {
      change(paint(map, brush(map, c, size), tool === 'erase' ? eraseCode : code), false);
    }
  };
  const onUp = (c: Cell) => {
    painting.current = false;
    if (!drag) return;
    // The release point is the real end corner, even if no move event arrived.
    const end: Cell = [Math.max(0, Math.min(map.width - 1, c[0])), Math.max(0, Math.min(map.height - 1, c[1]))];
    if (tool === 'line') change(paint(map, line(map, drag.start, end), code));
    if (tool === 'room') {
      const floor: TerrainCode = '.s'.includes(code) || code === 'd' ? code : '.';
      change(room(map, drag.start, end, floor));
    }
    setDrag(null);
  };

  const pickCode = (c: TerrainCode) => {
    setCode(c);
    if (tool === 'select' || tool === 'erase' || tool === 'viewer') setTool('paint');
  };

  const sel = selected && inBounds(map, ...selected) ? selected : null;
  const selCode = sel ? codeAt(map, ...sel) : null;
  const selInfo = selCode ? terrain(selCode) : null;
  const selProps: CellProps = sel ? map.props[cellKey(...sel)] ?? {} : {};
  const setSel = (patch: Partial<CellProps>) => sel && change(setProps(map, sel, patch));
  const num = (v: string) => (v === '' ? undefined : Math.max(0, Math.min(99, Number(v))));

  return (
    <div className="bm-builder">
      <div className="bm-bar">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`/dashboard/maps?campaign=${map.campaign_id ?? ''}`)}>‹ Maps</button>
        <input className="form-control input-theme bm-name" value={map.name} aria-label="Map name" onChange={(e) => change({ ...map, name: e.target.value }, false)} maxLength={120} />
        <span className="bm-meta">{map.grid === 'hex' ? '⬡ Hex' : '▦ Square'} · {map.width}×{map.height} · 5 ft</span>
        <span className="bm-spacer" />
        <div className="bm-tools" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button key={t.tool} type="button" title={t.hint} aria-label={t.label} aria-pressed={tool === t.tool} className={tool === t.tool ? 'is-on' : ''} onClick={() => setTool(t.tool)}>
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {(tool === 'paint' || tool === 'erase') && (
          <div className="bm-seg" role="radiogroup" aria-label="Brush size">
            {[1, 2, 3].map((n) => <button key={n} type="button" className={size === n ? 'is-on' : ''} onClick={() => setSize(n)} title={`Brush size ${n}`}>{n}</button>)}
          </div>
        )}
        <span className="bm-spacer" />
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={doUndo} disabled={!undo.current.length} title="Undo (⌘Z)">↶</button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={doRedo} disabled={!redo.current.length} title="Redo (⇧⌘Z)">↷</button>
        <span className={`bm-save ${save === 'error' ? 'is-error' : ''}`} role="status">
          {save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved' : save === 'error' ? 'Not saved — retrying on next change' : ''}
        </span>
      </div>

      <div className="bm-work">
        <aside className="bm-palette" aria-label="Terrain">
          {GROUPS.map((gr) => (
            <div key={gr}>
              <div className="bm-label">{GROUP_LABEL[gr]}</div>
              {TERRAIN.filter((t) => t.group === gr).map((t) => (
                <button key={t.code} type="button" className={`bm-pi ${code === t.code && tool !== 'select' && tool !== 'erase' && tool !== 'viewer' ? 'is-on' : ''}`}
                  onClick={() => pickCode(t.code)} title={t.rule} aria-label={t.name}>
                  <Swatch code={t.code} /> <span>{t.name}</span>{t.secret && <span className="bm-lock" aria-label="Hidden from players">🔒</span>}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="bm-canvas-wrap">
          <div className="bm-canvas-tools">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))} aria-label="Zoom out">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} aria-label="Zoom in">＋</button>
            <button type="button" className={showGrid ? 'is-on' : ''} onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid}>Grid</button>
            <button type="button" className={tool === 'viewer' || viewer ? 'is-on' : ''} onClick={() => { setTool('viewer'); }}
              title="Drop a test character to preview light and line of sight">👁 Vision test</button>
            {viewer && (
              <>
                <select value={viewerSense} onChange={(e) => setViewerSense(e.target.value as typeof viewerSense)} aria-label="Test character's senses">
                  <option value="none">No darkvision</option>
                  <option value="torch">Carrying a torch</option>
                  <option value="dark60">Darkvision 60 ft</option>
                  <option value="dark120">Darkvision 120 ft</option>
                </select>
                <button type="button" onClick={() => { setViewer(null); if (tool === 'viewer') setTool('select'); }}>Clear</button>
              </>
            )}
          </div>
          <div className="bm-canvas" ref={canvasRef} onPointerLeave={() => setHover(null)}>
            <BattleMapView
              map={map}
              zoom={zoom}
              showGrid={showGrid}
              seen={seen}
              selection={sel ? [sel] : undefined}
              preview={preview}
              previewColor={tool === 'erase' ? '#ef4444' : '#c9a94a'}
              tokens={viewer ? [{ id: 'viewer', x: viewer.x, y: viewer.y, label: '👁', kind: 'pc' }] : []}
              onCellDown={onDown}
              onCellMove={onMove}
              onCellUp={onUp}
            />
          </div>
          <div className="bm-hint">{TOOLS.find((t) => t.tool === tool)?.hint ?? 'Click a square to place the test character; it sees what a player there would see.'} · ⌘/Ctrl + scroll to zoom</div>
        </div>

        <aside className="bm-inspector" aria-label="Details">
          {sel && selInfo ? (
            <>
              <div className="bm-label">Square {sel[0] + 1}, {sel[1] + 1}</div>
              <div className="bm-insp-head"><Swatch code={selInfo.code} size={34} /><div><strong>{selInfo.name}</strong><small>{GROUP_LABEL[selInfo.group]}</small></div></div>
              <p className="bm-rule">{selInfo.rule}</p>

              {selCode === 'D' && (
                <>
                  <label className="bm-field">Door
                    <select className="form-select input-theme" value={selProps.state ?? 'closed'} onChange={(e) => setSel({ state: e.target.value as CellProps['state'] })}>
                      <option value="open">Open</option><option value="closed">Closed</option><option value="locked">Locked</option>
                    </select>
                  </label>
                  {selProps.state === 'locked' && (
                    <label className="bm-field">Lock DC<input className="form-control input-theme" type="number" value={selProps.lockDc ?? 15} onChange={(e) => setSel({ lockDc: num(e.target.value) })} /></label>
                  )}
                </>
              )}
              {selCode === 'o' && <label className="bm-field">Depth (ft)<input className="form-control input-theme" type="number" step={5} value={selProps.depth ?? 10} onChange={(e) => setSel({ depth: num(e.target.value) })} /></label>}
              {selCode === 'h' && <label className="bm-field">Height (ft)<input className="form-control input-theme" type="number" step={5} value={selProps.height ?? 10} onChange={(e) => setSel({ height: num(e.target.value) })} /></label>}
              {selCode === 'f' && <label className="bm-field">Damage<input className="form-control input-theme" value={selProps.damage ?? '1d10'} onChange={(e) => setSel({ damage: e.target.value.slice(0, 20) || undefined })} /></label>}
              {selCode === '^' && (
                <>
                  <label className="bm-field">Spot DC<input className="form-control input-theme" type="number" value={selProps.spotDc ?? 13} onChange={(e) => setSel({ spotDc: num(e.target.value) })} /></label>
                  <label className="bm-field">Disarm DC<input className="form-control input-theme" type="number" value={selProps.disarmDc ?? 13} onChange={(e) => setSel({ disarmDc: num(e.target.value) })} /></label>
                  <label className="bm-field">Effect<input className="form-control input-theme" placeholder="2d10 piercing, DEX 13 half" value={selProps.effect ?? ''} onChange={(e) => setSel({ effect: e.target.value.slice(0, 80) || undefined })} /></label>
                </>
              )}
              {(selCode === 'l' || selCode === 'f') && (
                <>
                  <label className="bm-field">Bright light (ft)<input className="form-control input-theme" type="number" step={5} value={selProps.bright ?? 20} onChange={(e) => setSel({ bright: num(e.target.value) })} /></label>
                  <label className="bm-field">Dim light beyond (ft)<input className="form-control input-theme" type="number" step={5} value={selProps.dim ?? 20} onChange={(e) => setSel({ dim: num(e.target.value) })} /></label>
                  {selCode === 'l' && (
                    <label className="bm-check"><input type="checkbox" checked={selProps.lit !== false} onChange={(e) => setSel({ lit: e.target.checked ? undefined : false })} /> Lit</label>
                  )}
                </>
              )}
              <label className="bm-field">Label on map<input className="form-control input-theme" placeholder="e.g. Altar" value={selProps.label ?? ''} onChange={(e) => setSel({ label: e.target.value.slice(0, 30) || undefined })} /></label>
              <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={() => setSelected(null)}>Map settings</button>
            </>
          ) : (
            <>
              <div className="bm-label">Map</div>
              <label className="bm-field">Lighting
                <select className="form-select input-theme" value={map.lighting} onChange={(e) => change({ ...map, lighting: e.target.value as Lighting })}>
                  <option value="bright">☀ Daylight / well lit</option>
                  <option value="dim">◐ Dim (dusk, moonlight)</option>
                  <option value="dark">☾ Dark (dungeon, night)</option>
                </select>
              </label>
              {map.grid === 'square' && (
                <label className="bm-field">Diagonals
                  <select className="form-select input-theme" value={map.settings.diagonals ?? '5'} onChange={(e) => change({ ...map, settings: { ...map.settings, diagonals: e.target.value as '5' | '5-10-5' } })}>
                    <option value="5">5 ft each (standard)</option>
                    <option value="5-10-5">5-10-5 (optional rule)</option>
                  </select>
                </label>
              )}
              <label className="bm-field">Players see
                <select className="form-select input-theme" value={map.settings.vision ?? 'party'} onChange={(e) => change({ ...map, settings: { ...map.settings, vision: e.target.value as 'party' | 'player' } })}>
                  <option value="party">What the whole party sees</option>
                  <option value="player">Only what their own character sees</option>
                </select>
              </label>
              <div className="bm-label mt-3">Size</div>
              <div className="bm-resize">
                <input className="form-control input-theme" type="number" min={MIN_SIZE} max={MAX_WIDTH} value={resizeTo?.w ?? map.width} onChange={(e) => setResizeTo({ w: Number(e.target.value), h: resizeTo?.h ?? map.height })} aria-label="Width" />
                <span>×</span>
                <input className="form-control input-theme" type="number" min={MIN_SIZE} max={MAX_HEIGHT} value={resizeTo?.h ?? map.height} onChange={(e) => setResizeTo({ w: resizeTo?.w ?? map.width, h: Number(e.target.value) })} aria-label="Height" />
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!resizeTo}
                  onClick={() => { if (resizeTo) change(resize(map, resizeTo.w, resizeTo.h, eraseCode)); setResizeTo(null); }}>Apply</button>
              </div>
              <p className="bm-rule mt-3">Pick a terrain on the left, then paint. Use <b>Select</b> to set door states, trap DCs, pit depth or light radius on a square.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
