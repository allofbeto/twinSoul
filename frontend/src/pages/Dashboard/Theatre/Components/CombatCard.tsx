import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { getMonster } from '../../../../api/backendHelpers';
import ActionsManager from './ActionsManager';
import { fromMonster, fromNpc, toggleEcon, type StatblockView } from './combatResources';
import type { Combatant, CombatResources } from './types';

// SRD stat blocks never change: look each one up once.
const monsterViews = new Map<string, Promise<StatblockView>>();
const loadMonsterView = (id: string) => {
  let p = monsterViews.get(id);
  if (!p) {
    p = getMonster(id).then((res) => fromMonster(res.data));
    p.catch(() => monsterViews.delete(id));
    monsterViews.set(id, p);
  }
  return p;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useStatblock(c: Combatant, rawById: Record<string, any>, enabled: boolean) {
  const [state, setState] = useState<{ view: StatblockView | null; loading: boolean; error: string }>({ view: null, loading: false, error: '' });

  useEffect(() => {
    if (!enabled) return undefined;
    const raw = c.itemId ? rawById[c.itemId] : null;
    if (raw) { setState({ view: fromNpc(raw), loading: false, error: '' }); return undefined; }
    if (!c.monsterId) { setState({ view: null, loading: false, error: '' }); return undefined; }
    let alive = true;
    setState({ view: null, loading: true, error: '' });
    loadMonsterView(c.monsterId)
      .then((view) => { if (alive) setState({ view, loading: false, error: '' }); })
      .catch(() => { if (alive) setState({ view: null, loading: false, error: 'Could not load this stat block.' }); });
    return () => { alive = false; };
  }, [enabled, c.itemId, c.monsterId, rawById]);

  return state;
}

interface Props {
  c: Combatant;
  isTurn: boolean;
  expanded: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawById: Record<string, any>;
  isDragOver: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onApplyHp: (delta: number) => void;
  onEditInit: (init: number) => void;
  onToggleReveal: () => void;
  onViewMonster?: (monsterId: string) => void;
  onSetRes: (res: CombatResources) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}

// One creature in the initiative order. DM-controlled ones (anything that
// isn't a player's character) open up to their actions and resources.
export default function CombatCard({
  c, isTurn, expanded, rawById, isDragOver, onToggle, onRemove, onApplyHp, onEditInit, onToggleReveal,
  onViewMonster, onSetRes, onDragStart, onDragEnd, onDragOver, onDrop,
}: Props) {
  const [amount, setAmount] = useState('');
  const dmControlled = !c.characterId;
  // Looked up even while folded away, so reactions and legendary actions show on the card itself.
  const { view, loading, error } = useStatblock(c, rawById, dmControlled);
  const down = c.maxHp > 0 && c.hp === 0;
  const amt = Math.abs(parseInt(amount, 10) || 0);

  // A player's character always has a reaction to track; a creature only when its stat block lists one.
  const reactionList = (view?.actions ?? []).filter((a) => a.group === 'reaction');
  const reactionFlag = !!c.characterId || reactionList.length > 0;
  const reactionNames = reactionList.map((a) => a.name).join(', ');
  const reactionUsed = !!c.res?.econ?.reaction;
  const legendaryPool = view?.legendaryPool ?? 0;
  const legendaryLeft = Math.max(0, legendaryPool - (c.res?.legendaryUsed ?? 0));

  const apply = (sign: 1 | -1) => {
    if (amt === 0) return;
    onApplyHp(sign * amt);
    setAmount('');
  };

  return (
    <div
      className={`theatre__ccard ${isTurn ? 'is-turn' : ''} ${c.isEnemy ? 'is-enemy' : ''} ${down ? 'is-down' : ''} ${isDragOver ? 'is-drop-target' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="theatre__ccard-top">
        <span className="theatre__drag-handle" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} title="Drag to reorder" aria-label={`Drag to reorder ${c.name}`}>⠿</span>
        <input
          type="number"
          className="theatre__input theatre__init-badge-input"
          value={c.init}
          onChange={(e) => onEditInit(parseInt(e.target.value, 10) || 0)}
          aria-label={`Initiative for ${c.name}`}
        />
        <span className="theatre__ccard-name">
          <strong>{c.name}</strong>
          <small>{c.characterId ? 'Player character' : c.isEnemy ? 'Enemy' : 'Ally'}{down ? ' · down' : ''}</small>
        </span>
        {c.armorClass != null && <span className="theatre__ac-badge" title="Armor Class">AC {c.armorClass}</span>}

        {dmControlled && (
          <button
            type="button"
            className={`theatre__mini theatre__ccard-eye ${c.revealed ? 'is-revealed' : ''}`}
            onClick={onToggleReveal}
            aria-pressed={!!c.revealed}
            aria-label={c.revealed ? `Hide ${c.name} from players` : `Reveal ${c.name} to players`}
            title={c.revealed ? 'Players can see this one. Tap to hide.' : 'Hidden from players. Tap to reveal.'}
          >
            <i className={`bx ${c.revealed ? 'bx-show' : 'bx-hide'}`} aria-hidden="true" />
            <span>{c.revealed ? 'Seen' : 'Hidden'}</span>
          </button>
        )}
        {c.monsterId && onViewMonster && (
          <button type="button" className="theatre__mini" onClick={() => onViewMonster(c.monsterId!)} aria-label={`View ${c.name} stat block`} title="Full stat block">
            <i className="bx bx-book-open" aria-hidden="true" />
          </button>
        )}
        <button type="button" className="theatre__mini theatre__ccard-remove" onClick={onRemove} aria-label={`Remove ${c.name}`} title="Remove (you can undo)">✕</button>
      </div>

      {(reactionFlag || legendaryPool > 0) && (
        <div className="theatre__flags">
          {reactionFlag && (
            <button
              type="button"
              className={`theatre__flag theatre__flag--reaction ${reactionUsed ? 'is-used' : ''}`}
              onClick={() => onSetRes(toggleEcon(c.res, 'reaction'))}
              aria-pressed={reactionUsed}
              title={`${reactionNames || 'Reaction'}. Tap to mark ${reactionUsed ? 'available' : 'used'}.`}
            >
              ↩ Reaction {reactionUsed ? 'used' : reactionNames ? `· ${reactionNames}` : 'ready'}
            </button>
          )}
          {legendaryPool > 0 && (
            <button
              type="button"
              className={`theatre__flag theatre__flag--legendary ${legendaryLeft === 0 ? 'is-used' : ''} ${legendaryLeft > 0 && !isTurn ? 'is-live' : ''}`}
              onClick={() => { if (!expanded) onToggle(); }}
              title="Legendary actions: spend them after another creature's turn"
            >
              ★ Legendary {legendaryLeft}/{legendaryPool}
            </button>
          )}
        </div>
      )}

      <div className="theatre__ccard-hp">
        {c.maxHp > 0 ? (
          <>
            <span className="theatre__hp-track" aria-hidden="true">
              <span className="theatre__hp-fill" style={{ width: `${Math.round((c.hp / c.maxHp) * 100)}%` }} />
            </span>
            <span className="theatre__hp-num">{c.hp}/{c.maxHp}</span>
          </>
        ) : (
          <span className="theatre__hp-num">No HP set</span>
        )}
        <input
          className="theatre__input theatre__input--tiny"
          inputMode="numeric"
          placeholder="±"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') apply(-1); }}
          aria-label={`Amount of HP to change for ${c.name}`}
        />
        <button type="button" className="theatre__mini theatre__mini--dmg" onClick={() => apply(-1)} disabled={amt === 0}>Damage</button>
        <button type="button" className="theatre__mini theatre__mini--heal" onClick={() => apply(1)} disabled={amt === 0}>Heal</button>
        {dmControlled && (
          <button type="button" className={`theatre__mini theatre__ccard-expand ${expanded ? 'is-on' : ''}`} onClick={onToggle} aria-expanded={expanded}>
            Actions {expanded ? '▴' : '▾'}
          </button>
        )}
      </div>

      {dmControlled && expanded && (
        <ActionsManager res={c.res} view={view} loading={loading} error={error} onChange={onSetRes} />
      )}
    </div>
  );
}
