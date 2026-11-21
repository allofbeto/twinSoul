import { useEffect, useMemo, useRef, useState } from 'react';
import CombatantPicker from './CombatantPicker';
import CombatCard from './CombatCard';
import type { Combatant, CombatantOption, CombatResources } from './types';

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
  onEditInit: (id: string, init: number) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onToggleReveal: (id: string) => void;
  onViewMonster: (monsterId: string) => void;
  onSetRes: (id: string, res: CombatResources) => void;
}

const num = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

// The Combat tab: round and turn, the order as cards (hide / reveal, remove,
// HP, and a creature's actions and resources), and a place to add people.
export default function CombatView(p: Props) {
  const { combatants, turn } = p;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false); // phones: the add panel folds away
  const [blankOpen, setBlankOpen] = useState(false);
  const [blank, setBlank] = useState({ name: '', init: '', hp: '', ac: '', isEnemy: true });
  const [confirmEnd, setConfirmEnd] = useState(false);
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
        <aside className={`theatre__combat-add ${addOpen ? 'is-open' : ''}`} aria-label="Add combatants">
          <button type="button" className="theatre__combat-add-toggle" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}>
            ＋ Add combatants {addOpen ? '▴' : '▾'}
          </button>
          <div className="theatre__combat-add-body">
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
          </div>
        </aside>

        <ul className="theatre__combat-order" aria-label="Initiative order">
          {combatants.length === 0 && (
            <li className="theatre__roll-empty">Nobody is in the fight yet. Search above for beasts, NPCs and your players’ characters.</li>
          )}
          {combatants.map((c, i) => (
            <li key={c.id} ref={i === turn ? turnRef : undefined} className="theatre__combat-slot">
              <CombatCard
                c={c}
                isTurn={i === turn}
                expanded={expanded.has(c.id)}
                rawById={p.rawById}
                isDragOver={overId === c.id}
                onToggle={() => toggle(c.id)}
                onRemove={() => p.onRemove(c.id)}
                onApplyHp={(d) => p.onApplyHp(c.id, d)}
                onEditInit={(n) => p.onEditInit(c.id, n)}
                onToggleReveal={() => p.onToggleReveal(c.id)}
                onViewMonster={p.onViewMonster}
                onSetRes={(res) => p.onSetRes(c.id, res)}
                onDragStart={() => setDragId(c.id)}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); if (dragId && c.id !== overId) setOverId(c.id); }}
                onDrop={() => { if (dragId && dragId !== c.id) p.onReorder(dragId, c.id); setDragId(null); setOverId(null); }}
              />
            </li>
          ))}
        </ul>
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
