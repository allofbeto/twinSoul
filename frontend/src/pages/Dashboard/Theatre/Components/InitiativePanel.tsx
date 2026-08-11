import type { MutableRefObject } from 'react';
import type { Combatant } from './types';

interface InitiativePanelProps {
  combatants: Combatant[];
  turn: number;
  cName: string;
  cInit: string;
  cHp: string;
  cEnemy: boolean;
  onNameChange: (value: string) => void;
  onInitChange: (value: string) => void;
  onHpChange: (value: string) => void;
  onToggleEnemy: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onApplyHp: (id: string, delta: number) => void;
  onNextTurn: () => void;
  onReset: () => void;
  dmgRefs: MutableRefObject<Record<string, string>>;
}

export default function InitiativePanel({
  combatants,
  turn,
  cName,
  cInit,
  cHp,
  cEnemy,
  onNameChange,
  onInitChange,
  onHpChange,
  onToggleEnemy,
  onAdd,
  onRemove,
  onApplyHp,
  onNextTurn,
  onReset,
  dmgRefs,
}: InitiativePanelProps) {
  return (
    <div className="theatre__init">
      <div className="theatre__init-add">
        <input className="theatre__input" placeholder="Name" value={cName}
          onChange={(e) => onNameChange(e.target.value)} aria-label="Combatant name" />
        <input className="theatre__input theatre__input--num" placeholder="Init" value={cInit}
          onChange={(e) => onInitChange(e.target.value)} aria-label="Initiative" />
        <input className="theatre__input theatre__input--num" placeholder="HP" value={cHp}
          onChange={(e) => onHpChange(e.target.value)} aria-label="Hit points" />
        <button
          type="button"
          className={`theatre__chip ${cEnemy ? 'is-enemy' : ''}`}
          onClick={onToggleEnemy}
          aria-pressed={cEnemy}
        >
          {cEnemy ? 'Enemy' : 'Ally'}
        </button>
        <button type="button" className="theatre__btn" onClick={onAdd}>Add</button>
        {combatants.length > 0 && (
          <>
            <button type="button" className="theatre__btn theatre__btn--ghost" onClick={onNextTurn}>Next turn ›</button>
            <button type="button" className="theatre__icon-btn" onClick={onReset}>Clear</button>
          </>
        )}
      </div>

      <ul className="theatre__init-list">
        {combatants.length === 0 && <li className="theatre__roll-empty">Add combatants to start tracking.</li>}
        {combatants.map((c, i) => (
          <li key={c.id} className={`theatre__combatant ${i === turn ? 'is-turn' : ''} ${c.isEnemy ? 'is-enemy' : ''} ${c.hp === 0 && c.maxHp > 0 ? 'is-down' : ''}`}>
            <span className="theatre__init-badge">{c.init}</span>
            <span className="theatre__combatant-name">{c.name}</span>
            {c.maxHp > 0 && (
              <span className="theatre__hp">
                <span className="theatre__hp-track">
                  <span
                    className="theatre__hp-fill"
                    style={{ width: `${Math.round((c.hp / c.maxHp) * 100)}%` }}
                  />
                </span>
                <span className="theatre__hp-num">{c.hp}/{c.maxHp}</span>
              </span>
            )}
            <span className="theatre__combatant-actions">
              <input
                className="theatre__input theatre__input--tiny"
                placeholder="±"
                defaultValue=""
                onChange={(e) => { dmgRefs.current[c.id] = e.target.value; }}
                aria-label={`Adjust HP for ${c.name}`}
              />
              <button type="button" className="theatre__mini theatre__mini--dmg"
                onClick={() => onApplyHp(c.id, -Math.abs(parseInt(dmgRefs.current[c.id] || '0', 10) || 0))}>
                Damage
              </button>
              <button type="button" className="theatre__mini theatre__mini--heal"
                onClick={() => onApplyHp(c.id, Math.abs(parseInt(dmgRefs.current[c.id] || '0', 10) || 0))}>
                Heal
              </button>
              <button type="button" className="theatre__mini" onClick={() => onRemove(c.id)} aria-label={`Remove ${c.name}`}>✕</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}