import { useEffect, useMemo, useRef, useState } from 'react';
import CombatantPicker from './CombatantPicker';
import CombatCard from './CombatCard';
import CombatMap from './CombatMap';
import { DAMAGE_TYPES } from './conditions';
import type { Cell } from '../../../../battlemap/grid';
import type { CombatMapRef, Combatant, CombatantOption, CombatResources, DetailTarget } from './types';

export interface BlankCombatant {
  name: string;
  init?: number;
  hp?: number;
  ac?: number;
  isEnemy: boolean;
}

interface Props {
  combatants: Combatant[];
  turn: number;
  round: number;
  options: CombatantOption[];
  optionsLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawById: Record<string, any>;
  /** The last removal, until it times out. */
  undo: { label: string; run: () => void } | null;
  onAddOption: (option: CombatantOption, qty: number) => void;
  onAddBlank: (data: BlankCombatant) => void;
  onRemove: (id: string) => void;
  onRemoveDefeated: () => void;
  onEnd: () => void;
  onNextTurn: () => void;
  onSortByInit: () => void;
  onApplyHp: (id: string, delta: number) => void;
  onAddTemp: (id: string, amount: number) => void;
  onClearTemp: (id: string) => void;
  onToggleCondition: (id: string, name: string) => void;
  onSetExhaustion: (id: string, level: number) => void;
  onEditInit: (id: string, init: number) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onToggleReveal: (id: string) => void;
  onViewDetails: (target: DetailTarget) => void;
  onSetRes: (id: string, res: CombatResources) => void;
  // Battle map
  campaignId: string | null;
  sessionId: string | null;
  mapRef: CombatMapRef | null;
  onSetMap: (ref: CombatMapRef | null, positions?: Record<string, Cell | null>) => void;
  onPlace: (positions: Record<string, Cell | null>) => void;
  onQuickMap?: (ref: CombatMapRef) => void;
}

const num = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

// The Combat tab: round and turn up top; the initiative order (or the add
// panel) on the left; the battle map on the right, linked to the same fight.
export default function CombatView(p: Props) {
  const { combatants, turn } = p;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Left column shows the order, or the panel for adding people.
  const [side, setSide] = useState<'order' | 'add'>(combatants.length ? 'order' : 'add');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());
  const [blankOpen, setBlankOpen] = useState(false);
  const [blank, setBlank] = useState({ name: '', init: '', hp: '', ac: '', isEnemy: true });
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Check everyone against one damage type: who resists it, who is immune, who is weak to it.
  const [lens, setLens] = useState<string | null>(null);
  const turnRef = useRef<HTMLLIElement | null>(null);

  const current = combatants[turn];
  const defeated = useMemo(() => combatants.filter((c) => c.maxHp > 0 && c.hp === 0).length, [combatants]);
  const inCombat = useMemo(() => new Set(combatants.flatMap((c) => (c.characterId ? [c.characterId] : []))), [combatants]);

  // The creature whose turn it is opens up, so its actions are right there.
  useEffect(() => {
    if (current && !current.characterId) setExpanded((prev) => new Set(prev).add(current.id));
    turnRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const addBlank = () => {
    const name = blank.name.trim();
    if (!name) return;
    p.onAddBlank({ name, init: num(blank.init), hp: num(blank.hp), ac: num(blank.ac), isEnemy: blank.isEnemy });
    setBlank({ ...blank, name: '', init: '', hp: '', ac: '' });
  };

  // Each combatant's art and one-line description, from wherever they came from.
  const looks = useMemo(() => {
    const out: Record<string, { imageUrl?: string; subtitle?: string }> = {};
    for (const c of combatants) {
      const o = p.options.find((x) =>
        (c.characterId && x.characterId === c.characterId) || (c.itemId && x.itemId === c.itemId) || (c.monsterId && x.monsterId === c.monsterId));
      if (o) out[c.id] = { imageUrl: o.imageUrl, subtitle: o.subtitle };
    }
    return out;
  }, [combatants, p.options]);

  // Picking a token on the map opens its card in the order.
  const selectMapToken = (id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    setSide('order');
    setExpanded((prev) => new Set(prev).add(id));
    requestAnimationFrame(() => cardRefs.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };

  return (
    <div className="theatre__combat">
      <header className="theatre__combat-bar">
        <div className="theatre__combat-stat"><small>Round</small><strong>{p.round}</strong></div>
        <div className="theatre__combat-stat theatre__combat-now">
          <small>Now</small>
          <strong>{current?.name ?? '—'}</strong>
        </div>
        <div className="theatre__combat-actions">
          <button type="button" className="theatre__btn" onClick={p.onNextTurn} disabled={combatants.length === 0}>Next turn ›</button>
          <button type="button" className="theatre__btn theatre__btn--ghost" onClick={p.onSortByInit} disabled={combatants.length < 2} title="Order everyone by initiative, highest first">Sort</button>
          {defeated > 0 && (
            <button type="button" className="theatre__btn theatre__btn--ghost" onClick={p.onRemoveDefeated}>Remove defeated ({defeated})</button>
          )}
          <button
            type="button"
            className={`theatre__btn theatre__btn--ghost ${confirmEnd ? 'is-danger' : ''}`}
            onClick={() => (confirmEnd ? p.onEnd() : setConfirmEnd(true))}
            onBlur={() => setConfirmEnd(false)}
          >
            {confirmEnd ? 'Really end?' : 'End combat'}
          </button>
        </div>
      </header>

      <div className="theatre__combat-body">
        <div className="theatre__combat-side">
          <div className="theatre__combat-side-head">
            <div className="theatre__seg" role="tablist" aria-label="Left panel">
              <button type="button" role="tab" aria-selected={side === 'order'} className={side === 'order' ? 'is-on' : ''} onClick={() => setSide('order')}>
                Order <small>{combatants.length}</small>
              </button>
              <button type="button" role="tab" aria-selected={side === 'add'} className={side === 'add' ? 'is-on' : ''} onClick={() => setSide('add')}>＋ Add</button>
            </div>
            {side === 'order' && (
              <select className="theatre__input theatre__lens-select" value={lens ?? ''} onChange={(e) => setLens(e.target.value || null)} aria-label="Check who resists a damage type">
                <option value="">Check damage type…</option>
                {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>

          {side === 'add' ? (
            <div className="theatre__combat-add" aria-label="Add combatants">
              <CombatantPicker options={p.options} loading={p.optionsLoading} inCombat={inCombat} onAdd={p.onAddOption} />
              <button type="button" className="theatre__init-blank-toggle" aria-expanded={blankOpen} onClick={() => setBlankOpen((v) => !v)}>
                {blankOpen ? '▾' : '▸'} Add a blank combatant
              </button>
              {blankOpen && (
                <div className="theatre__init-add">
                  <input className="theatre__input" placeholder="Name" value={blank.name} onChange={(e) => setBlank({ ...blank, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') addBlank(); }} aria-label="Combatant name" />
                  <input className="theatre__input theatre__input--num" placeholder="AC" inputMode="numeric" value={blank.ac} onChange={(e) => setBlank({ ...blank, ac: e.target.value })} aria-label="Armor class" />
                  <input className="theatre__input theatre__input--num" placeholder="HP" inputMode="numeric" value={blank.hp} onChange={(e) => setBlank({ ...blank, hp: e.target.value })} aria-label="Hit points" />
                  <input className="theatre__input theatre__input--num" placeholder="Init" inputMode="numeric" value={blank.init} onChange={(e) => setBlank({ ...blank, init: e.target.value })}
                    aria-label="Initiative (rolled if blank)" title="Rolled if left blank" />
                  <button type="button" className={`theatre__chip ${blank.isEnemy ? 'is-enemy' : ''}`} onClick={() => setBlank({ ...blank, isEnemy: !blank.isEnemy })} aria-pressed={blank.isEnemy}>
                    {blank.isEnemy ? 'Enemy' : 'Ally'}
                  </button>
                  <button type="button" className="theatre__btn" onClick={addBlank} disabled={!blank.name.trim()}>Add</button>
                </div>
              )}
              <button type="button" className="theatre__btn theatre__btn--ghost theatre__combat-done" onClick={() => setSide('order')}>Done adding ›</button>
            </div>
          ) : (
            <ul className="theatre__combat-order" aria-label="Initiative order">
              {combatants.length === 0 && (
                <li className="theatre__roll-empty">Nobody is in the fight yet. <button type="button" className="theatre__mini" onClick={() => setSide('add')}>＋ Add combatants</button></li>
              )}
              {combatants.map((c, i) => (
                <li
                  key={c.id}
                  ref={(el) => { if (el) cardRefs.current.set(c.id, el); else cardRefs.current.delete(c.id); if (i === turn) turnRef.current = el; }}
                  className={`theatre__combat-slot ${selectedId === c.id ? 'is-selected' : ''}`}
                >
                  <CombatCard
                    c={c}
                    isTurn={i === turn}
                    expanded={expanded.has(c.id)}
                    rawById={p.rawById}
                    isDragOver={overId === c.id}
                    onToggle={() => { toggle(c.id); setSelectedId(c.id); }}
                    onRemove={() => p.onRemove(c.id)}
                    onApplyHp={(d) => p.onApplyHp(c.id, d)}
                    onAddTemp={(n) => p.onAddTemp(c.id, n)}
                    onClearTemp={() => p.onClearTemp(c.id)}
                    onToggleCondition={(name) => p.onToggleCondition(c.id, name)}
                    onSetExhaustion={(n) => p.onSetExhaustion(c.id, n)}
                    lens={lens}
                    onEditInit={(n) => p.onEditInit(c.id, n)}
                    onToggleReveal={() => p.onToggleReveal(c.id)}
                    onViewDetails={p.onViewDetails}
                    onSetRes={(res) => p.onSetRes(c.id, res)}
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onDragOver={(e) => { e.preventDefault(); if (dragId && c.id !== overId) setOverId(c.id); }}
                    onDrop={() => { if (dragId && dragId !== c.id) p.onReorder(dragId, c.id); setDragId(null); setOverId(null); }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <CombatMap
          campaignId={p.campaignId}
          sessionId={p.sessionId}
          mapRef={p.mapRef}
          combatants={combatants}
          turn={turn}
          selectedId={selectedId}
          looks={looks}
          onSelect={selectMapToken}
          onSetMap={p.onSetMap}
          onPlace={p.onPlace}
          onApplyHp={p.onApplyHp}
          onQuickMap={p.onQuickMap}
        />
      </div>

      {p.undo && (
        <div className="theatre__toast" role="status">
          <span>{p.undo.label}</span>
          <button type="button" onClick={p.undo.run}>Undo</button>
        </div>
      )}
    </div>
  );
}
