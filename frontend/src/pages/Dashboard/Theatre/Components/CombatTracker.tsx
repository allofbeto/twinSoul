import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { getMonster } from '../../../../api/backendHelpers';
import MonsterStatBlockContent, { MonsterStatBlockData } from '../../Monsters/Components/MonsterStatBlockContent';
import type { InitiativeState } from './types';

interface CombatTrackerProps {
  initiative: InitiativeState;
}

const NAME_LIMIT = 12;
const truncateName = (name: string) =>
  name.length > NAME_LIMIT ? `${name.slice(0, NAME_LIMIT - 1)}…` : name;

// The full combat tracker for an active encounter: a compact 1/3-width
// initiative order (drag to reorder, AC + HP at a glance) next to a 2/3
// detail pane for whoever's selected — their stat block (actions, reactions,
// legendary actions) when it's a bestiary monster — plus the turn controls.
export default function CombatTracker({ initiative }: CombatTrackerProps) {
  const {
    combatants, turn, cName, cInit, cHp, cAc, cEnemy,
    onNameChange, onInitChange, onHpChange, onAcChange, onToggleEnemy,
    onAdd, onRemove, onApplyHp, onEditInit, onReorder, onInheritStats,
    onNextTurn, onReset, dmgRefs,
  } = initiative;

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Older encounters (built before AC/HP were snapshotted) leave some rows
  // with nothing to show — pull those stats from the monster itself, once
  // per creature, and fold them into the combatant so the badge/bar and the
  // damage/heal controls all start working normally.
  const inheritRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = combatants.filter((c) => c.monsterId && (c.armorClass == null || !(c.maxHp > 0)));
    const toFetch = Array.from(new Set(missing.map((c) => c.monsterId as string)))
      .filter((id) => !inheritRequestedRef.current.has(id));
    toFetch.forEach((monsterId) => {
      inheritRequestedRef.current.add(monsterId);
      getMonster(monsterId)
        .then((res) => {
          const stats = { armorClass: res.data.armor_class ?? null, maxHp: res.data.hit_points ?? 0 };
          missing
            .filter((c) => c.monsterId === monsterId)
            .forEach((c) => onInheritStats(c.id, stats));
        })
        .catch(() => { /* row just keeps showing whatever it already had */ });
    });
  }, [combatants, onInheritStats]);

  // Follow whoever's turn it is; clicking someone else lets the DM peek
  // without losing track of the active combatant — it resyncs on Next Turn.
  useEffect(() => {
    setSelectedId(combatants[turn]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  const selected = combatants.find((c) => c.id === selectedId) ?? null;

  const [monster, setMonster] = useState<MonsterStatBlockData | null>(null);
  const [monsterLoading, setMonsterLoading] = useState(false);
  const [monsterError, setMonsterError] = useState('');

  useEffect(() => {
    if (!selected?.monsterId) { setMonster(null); return; }
    let alive = true;
    setMonsterLoading(true);
    setMonsterError('');
    getMonster(selected.monsterId)
      .then((res) => { if (alive) setMonster(res.data); })
      .catch(() => { if (alive) setMonsterError('Could not load this monster.'); })
      .finally(() => { if (alive) setMonsterLoading(false); });
    return () => { alive = false; };
  }, [selected?.monsterId]);

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
    <div className="theatre__combat-tracker">
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

      <div className="theatre__combat-columns">
        <ul className="theatre__combat-list">
          {combatants.length === 0 && <li className="theatre__roll-empty">Add combatants to start tracking.</li>}
          {combatants.map((c, i) => (
            <li
              key={c.id}
              className={`theatre__combatant theatre__combat-row ${i === turn ? 'is-turn' : ''} ${c.id === selectedId ? 'is-selected' : ''} ${c.isEnemy ? 'is-enemy' : ''} ${c.hp === 0 && c.maxHp > 0 ? 'is-down' : ''} ${overId === c.id ? 'is-drop-target' : ''}`}
              onDragOver={(e) => handleDragOver(e, c.id)}
              onDragLeave={() => setOverId((cur) => (cur === c.id ? null : cur))}
              onDrop={() => handleDrop(c.id)}
              onClick={() => setSelectedId(c.id)}
            >
              <span
                className="theatre__drag-handle"
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragId(c.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Drag to reorder ${c.name}`}
                title="Drag to reorder"
              >
                ⠿
              </span>
              <input
                type="number"
                className="theatre__input theatre__init-badge-input"
                value={c.init}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onEditInit(c.id, parseInt(e.target.value, 10) || 0)}
                aria-label={`Initiative for ${c.name}`}
                title="Edit initiative"
              />
              <span className="theatre__combatant-name" title={c.name}>{truncateName(c.name)}</span>
              {c.armorClass != null && <span className="theatre__ac-badge">AC {c.armorClass}</span>}
              {c.maxHp > 0 && (
                <span className="theatre__hp">
                  <span className="theatre__hp-track">
                    <span className="theatre__hp-fill" style={{ width: `${Math.round((c.hp / c.maxHp) * 100)}%` }} />
                  </span>
                  <span className="theatre__hp-num">{c.hp}/{c.maxHp}</span>
                </span>
              )}
              <button
                type="button"
                className="theatre__mini"
                onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}
                aria-label={`Remove ${c.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <div className="theatre__combat-detail">
          {!selected ? (
            <p className="theatre__roll-empty">Select a combatant to see their details.</p>
          ) : (
            <>
              <div className="theatre__combat-detail-head">
                <h2 className="theatre__combat-detail-name">{selected.name}</h2>
                <div className="theatre__combat-detail-stats">
                  {selected.armorClass != null && <span className="theatre__ac-badge">AC {selected.armorClass}</span>}
                  {selected.maxHp > 0 && (
                    <span className="theatre__hp">
                      <span className="theatre__hp-track">
                        <span className="theatre__hp-fill" style={{ width: `${Math.round((selected.hp / selected.maxHp) * 100)}%` }} />
                      </span>
                      <span className="theatre__hp-num">{selected.hp}/{selected.maxHp}</span>
                    </span>
                  )}
                </div>
                <div className="theatre__combat-detail-hp-controls">
                  <input
                    className="theatre__input theatre__input--tiny"
                    placeholder="±"
                    defaultValue=""
                    onChange={(e) => { dmgRefs.current[selected.id] = e.target.value; }}
                    aria-label={`Adjust HP for ${selected.name}`}
                  />
                  <button type="button" className="theatre__mini theatre__mini--dmg"
                    onClick={() => onApplyHp(selected.id, -Math.abs(parseInt(dmgRefs.current[selected.id] || '0', 10) || 0))}>
                    Damage
                  </button>
                  <button type="button" className="theatre__mini theatre__mini--heal"
                    onClick={() => onApplyHp(selected.id, Math.abs(parseInt(dmgRefs.current[selected.id] || '0', 10) || 0))}>
                    Heal
                  </button>
                </div>
              </div>

              {selected.monsterId ? (
                <>
                  {monsterLoading && <p className="text-muted-theme">Loading stat block…</p>}
                  {monsterError && <p className="theatre__roll-empty">{monsterError}</p>}
                  {!monsterLoading && !monsterError && monster && (
                    <div className="theatre__combat-detail-statblock">
                      <MonsterStatBlockContent monster={monster} />
                    </div>
                  )}
                </>
              ) : (
                <p className="theatre__roll-empty">No stat block for this combatant.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
