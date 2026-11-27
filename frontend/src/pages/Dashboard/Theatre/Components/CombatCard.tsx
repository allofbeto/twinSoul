import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { getMonster } from '../../../../api/backendHelpers';
import ActionsManager from './ActionsManager';
import { fromMonster, fromNpc, toggleEcon, type StatblockView } from './combatResources';
import { CONDITIONS, EXHAUSTION_EFFECT, effectAgainst, hasDefenses, type DefenseEntry } from './conditions';
import { hpDisplay } from './hp';
import { isCritical, useHpFx } from './useHpFx';
import type { Combatant, CombatResources, DetailTarget } from './types';

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
  onAddTemp: (amount: number) => void;
  onClearTemp: () => void;
  onToggleCondition: (name: string) => void;
  onSetExhaustion: (level: number) => void;
  /** The damage type the DM is checking everyone against, if any. */
  lens: string | null;
  onEditInit: (init: number) => void;
  onToggleReveal: () => void;
  onViewDetails: (target: DetailTarget) => void;
  onSetRes: (res: CombatResources) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}

function DefenseLine({ kind, label, entries }: { kind: 'resist' | 'immune' | 'vulnerable'; label: string; entries?: DefenseEntry[] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <span className={`theatre__def theatre__def--${kind}`}>
      <b>{label}</b> {entries.map((e) => e.label).join(' · ')}
    </span>
  );
}

// One creature in the initiative order. DM-controlled ones (anything that
// isn't a player's character) open up to their actions and resources.
export default function CombatCard({
  c, isTurn, expanded, rawById, isDragOver, onToggle, onRemove, onApplyHp, onAddTemp, onClearTemp, onToggleCondition, onSetExhaustion, lens, onEditInit, onToggleReveal,
  onViewDetails, onSetRes, onDragStart, onDragEnd, onDragOver, onDrop,
}: Props) {
  const [amount, setAmount] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const dmControlled = !c.characterId;
  // Looked up even while folded away, so reactions and legendary actions show on the card itself.
  const { view, loading, error } = useStatblock(c, rawById, dmControlled);
  const down = c.maxHp > 0 && c.hp === 0;
  // At 0 HP an enemy is dead; a player character or ally is dying (death saves).
  const dead = down && !!c.isEnemy;
  const dying = down && !c.isEnemy;
  const amt = Math.abs(parseInt(amount, 10) || 0);
  const hp = hpDisplay(c);
  const fx = useHpFx(c.hp, c.tempHp ?? 0);
  const critical = isCritical(c.hp, c.maxHp);
  const conditions = c.conditions ?? [];
  const exhaustion = c.exhaustion ?? 0;
  const against = effectAgainst(view?.defenses, lens);
  const detail: DetailTarget | null = c.characterId
    ? { kind: 'character', id: c.characterId, title: c.name }
    : c.itemId ? { kind: 'npc', id: c.itemId, title: c.name }
      : c.monsterId ? { kind: 'monster', id: c.monsterId, title: c.name } : null;

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
      className={`theatre__ccard ${isTurn ? 'is-turn' : ''} ${c.isEnemy ? 'is-enemy' : ''} ${dead ? 'is-dead' : ''} ${dying ? 'is-dying' : ''} ${isDragOver ? 'is-drop-target' : ''}`}
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
          <small>{c.characterId ? 'Player character' : c.isEnemy ? 'Enemy' : 'Ally'}{dead ? ' · dead' : dying ? ' · dying' : ''}</small>
        </span>
        {against && (
          <span className={`theatre__lens theatre__lens--${against.kind}`} title={`${lens}${against.note ? `: ${against.note}` : ''}`}>
            {against.kind === 'immune' ? 'Immune' : against.kind === 'resist' ? '×½ Resists' : '×2 Vulnerable'}{against.note ? ' *' : ''}
          </span>
        )}
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
        {detail && (
          <button
            type="button"
            className="theatre__mini theatre__ccard-stats"
            onClick={() => onViewDetails(detail)}
            aria-label={`View ${c.name} ${detail.kind === 'character' ? 'character sheet' : 'stat block'}`}
            title={detail.kind === 'character' ? 'Character sheet' : 'Full stat block'}
          >
            <i className="bx bx-book-open" aria-hidden="true" />
            <span>Stats</span>
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
            <span className={`theatre__hpbox ${fx.kind ? `is-${fx.kind}` : ''} ${fx.key % 2 ? 'is-b' : ''} ${critical ? 'is-critical' : ''}`}>
              <span className="theatre__hp-track" aria-hidden="true">
                <span className="theatre__hp-temp" style={{ width: `${hp.totalPercent}%`, opacity: hp.temp > 0 ? 0.85 : 0 }} />
                <span className="theatre__hp-ghost" style={{ width: `${hp.realPercent}%` }} />
                <span className="theatre__hp-fill" style={{ width: `${hp.realPercent}%`, background: hp.color }} />
              </span>
              <span className="theatre__hp-num theatre__hp-num--big" style={{ color: hp.color }}>{hp.total}/{hp.max}</span>
            </span>
            {hp.temp > 0 && (
              <span className="theatre__temp-chip" title={`${hp.temp} temporary HP: damage hits these first`}>
                +{hp.temp} temp
                <button type="button" onClick={onClearTemp} aria-label={`Clear ${c.name}'s temporary HP`}>✕</button>
              </span>
            )}
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
        <button
          type="button"
          className="theatre__mini theatre__mini--temp"
          onClick={() => { if (amt > 0) { onAddTemp(amt); setAmount(''); } }}
          disabled={amt === 0}
          title="Add temporary HP (shown on top of the maximum, and soaked up by damage first)"
        >
          Temp
        </button>
        {dmControlled && (
          <button type="button" className={`theatre__mini theatre__ccard-expand ${expanded ? 'is-on' : ''}`} onClick={onToggle} aria-expanded={expanded}>
            Actions {expanded ? '▴' : '▾'}
          </button>
        )}
      </div>

      <div className="theatre__statuses" aria-label="Statuses">
        {conditions.map((name) => (
          <button
            key={name}
            type="button"
            className="theatre__status"
            onClick={() => onToggleCondition(name)}
            title={`${CONDITIONS.find((x) => x.name === name)?.effect ?? ''} Tap to clear.`}
            aria-label={`${name}: tap to clear`}
          >
            {name} <span aria-hidden="true">✕</span>
          </button>
        ))}
        {exhaustion > 0 && (
          <button type="button" className="theatre__status" onClick={() => onSetExhaustion(0)} title={`${EXHAUSTION_EFFECT[exhaustion]} Tap to clear.`}>
            Exhaustion {exhaustion} <span aria-hidden="true">✕</span>
          </button>
        )}
        <button type="button" className="theatre__chip theatre__status-add" aria-expanded={statusOpen} onClick={() => setStatusOpen((o) => !o)}>
          ＋ Status
        </button>
      </div>

      {statusOpen && (
        <div className="theatre__status-picker" role="group" aria-label={`Statuses for ${c.name}`}>
          {CONDITIONS.map((cond) => (
            <button
              key={cond.name}
              type="button"
              className={`theatre__chip ${conditions.includes(cond.name) ? 'is-on' : ''}`}
              aria-pressed={conditions.includes(cond.name)}
              onClick={() => onToggleCondition(cond.name)}
              title={cond.effect}
            >
              {cond.name}
            </button>
          ))}
          <span className="theatre__exhaustion">
            Exhaustion
            <button type="button" className="theatre__mini" onClick={() => onSetExhaustion(Math.max(0, exhaustion - 1))} aria-label="Less exhaustion">−</button>
            <strong>{exhaustion}</strong>
            <button type="button" className="theatre__mini" onClick={() => onSetExhaustion(Math.min(6, exhaustion + 1))} aria-label="More exhaustion">+</button>
          </span>
        </div>
      )}

      {hasDefenses(view?.defenses) || view?.defenseNote ? (
        <div className="theatre__defenses" aria-label="Resistances and immunities">
          <DefenseLine kind="resist" label="Resists" entries={view?.defenses?.resist} />
          <DefenseLine kind="immune" label="Immune" entries={view?.defenses?.immune} />
          <DefenseLine kind="vulnerable" label="Vulnerable" entries={view?.defenses?.vulnerable} />
          {(view?.defenses?.conditionImmune.length ?? 0) > 0 && (
            <span className="theatre__def theatre__def--condition"><b>Can’t be</b> {view?.defenses?.conditionImmune.join(', ').toLowerCase()}</span>
          )}
          {view?.defenseNote && <span className="theatre__def"><b>Also</b> {view.defenseNote}</span>}
        </div>
      ) : null}

      {dmControlled && expanded && (
        <ActionsManager res={c.res} view={view} loading={loading} error={error} onChange={onSetRes} />
      )}
    </div>
  );
}
