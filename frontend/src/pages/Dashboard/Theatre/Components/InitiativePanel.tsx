import { useState } from 'react';
import type { DragEvent } from 'react';
import type { InitiativeState } from './types';

export default function InitiativePanel({
  combatants,
  turn,
  cName,
  cInit,
  cHp,
  cAc,
  cEnemy,
  onNameChange,
  onInitChange,
  onHpChange,
  onAcChange,
  onToggleEnemy,
  onAdd,
  onRemove,
  onApplyHp,
  onEditInit,
  onReorder,
  onViewMonster,
  onNextTurn,
  onReset,
  dmgRefs,
}: InitiativeState) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragOver = (e: DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault();
    if (dragId && id !== overId) setOverId(id);
  };

  const handleDrop = (id: string) => {
    if (dragId && dragId !== id) onReorder(dragId, id);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="theatre__init">
      <div className="theatre__init-add">
        <input className="theatre__input" placeholder="Name" value={cName}
          onChange={(e) => onNameChange(e.target.value)} aria-label="Combatant name" />
        <input className="theatre__input theatre__input--num" placeholder="AC" value={cAc}
          onChange={(e) => onAcChange(e.target.value)} aria-label="Armor class" />
        <input className="theatre__input theatre__input--num" placeholder="HP" value={cHp}
          onChange={(e) => onHpChange(e.target.value)} aria-label="Hit points" />
        <input className="theatre__input theatre__input--num" placeholder="Init" value={cInit}
          onChange={(e) => onInitChange(e.target.value)}
          aria-label="Initiative (optional — auto-rolled if blank)"
          title="Optional — auto-rolled if left blank" />
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
          <li
            key={c.id}
            className={`theatre__combatant ${i === turn ? 'is-turn' : ''} ${c.isEnemy ? 'is-enemy' : ''} ${c.hp === 0 && c.maxHp > 0 ? 'is-down' : ''} ${overId === c.id ? 'is-drop-target' : ''}`}
            onDragOver={(e) => handleDragOver(e, c.id)}
            onDragLeave={() => setOverId((cur) => (cur === c.id ? null : cur))}
            onDrop={() => handleDrop(c.id)}
          >
            <span
              className="theatre__drag-handle"
              draggable
              onDragStart={() => setDragId(c.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              aria-label={`Drag to reorder ${c.name}`}
              title="Drag to reorder"
            >
              ⠿
            </span>
            <input
              type="number"
              className="theatre__input theatre__init-badge-input"
              value={c.init}
              onChange={(e) => onEditInit(c.id, parseInt(e.target.value, 10) || 0)}
              aria-label={`Initiative for ${c.name}`}
              title="Edit initiative"
            />
            <span className="theatre__combatant-name">{c.name}</span>
            {c.armorClass != null && (
              <span className="theatre__ac-badge" title="Armor Class">AC {c.armorClass}</span>
            )}
            {c.monsterId && onViewMonster && (
              <button
                type="button"
                className="theatre__mini"
                onClick={() => onViewMonster(c.monsterId!)}
                aria-label={`View ${c.name} details`}
                title="View stat block"
              >
                <i className="bx bx-show" aria-hidden="true" />
              </button>
            )}
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
