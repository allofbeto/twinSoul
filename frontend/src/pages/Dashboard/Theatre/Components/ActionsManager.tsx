import { useState } from 'react';
import type { CombatResources } from './types';
import {
  GROUP_ORDER, adjustLegendary, adjustSlot, adjustUsed, econFor, toggleEcon, usedOf,
  type ActionView, type StatblockView,
} from './combatResources';

const ECON = [
  { key: 'action', label: 'Action' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'move', label: 'Move' },
] as const;

const ORDINAL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

// Filled pips are what's left. Tap a filled one to spend it, an empty one to get it back.
function Pips({ total, used, label, onChange }: { total: number; used: number; label: string; onChange: (delta: number) => void }) {
  const left = total - used;
  return (
    <span className="theatre__pips" role="group" aria-label={`${label}: ${left} of ${total} left`}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`theatre__pip ${i < left ? 'is-full' : ''}`}
          onClick={() => onChange(i < left ? 1 : -1)}
          aria-label={i < left ? `Use one ${label}` : `Restore one ${label}`}
        />
      ))}
    </span>
  );
}

interface RowProps {
  action: ActionView;
  res: CombatResources | undefined;
  poolLeft: number;
  onChange: (res: CombatResources) => void;
}

function ActionRow({ action: a, res, poolLeft, onChange }: RowProps) {
  const [open, setOpen] = useState(false);
  const econ = econFor(a.group);
  const spent = usedOf(res, a.key) > 0;
  const econUsed = econ ? !!res?.econ?.[econ] : false;

  return (
    <li className={`theatre__act ${a.recharge && spent ? 'is-spent' : ''}`}>
      <div className="theatre__act-head">
        <button type="button" className="theatre__act-main" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <strong>{a.name}</strong>
          {a.summary && <small>{a.summary}</small>}
        </button>

        <span className="theatre__act-tools">
          {a.limit && (
            <Pips
              total={a.limit.max}
              used={usedOf(res, a.key)}
              label={`${a.name} (${a.limit.max}/${a.limit.per})`}
              onChange={(d) => onChange(adjustUsed(res, a.key, d, a.limit!.max))}
            />
          )}
          {a.recharge && (
            <button
              type="button"
              className={`theatre__mini ${spent ? 'is-spent' : 'is-ready'}`}
              onClick={() => onChange(adjustUsed(res, a.key, spent ? -1 : 1, 1))}
              aria-pressed={spent}
              title={spent ? 'Spent: tap when it recharges' : 'Ready: tap to spend'}
            >
              {spent ? `Spent ↻${a.recharge}` : 'Ready'}
            </button>
          )}
          {a.group === 'legendary' && (
            <button
              type="button"
              className="theatre__mini"
              disabled={(a.cost ?? 1) > poolLeft}
              onClick={() => onChange(adjustLegendary(res, a.cost ?? 1, 3))}
              title={(a.cost ?? 1) > poolLeft ? 'Not enough legendary actions left' : undefined}
            >
              Use{(a.cost ?? 1) > 1 ? ` (${a.cost})` : ''}
            </button>
          )}
          {econ && (
            <button
              type="button"
              className={`theatre__mini ${econUsed ? 'is-on' : ''}`}
              onClick={() => onChange(toggleEcon(res, econ))}
              aria-pressed={econUsed}
              title={`Marks the ${econ} as used this turn`}
            >
              {econUsed ? 'Used' : 'Use'}
            </button>
          )}
        </span>
      </div>
      {open && <p className="theatre__act-desc">{a.desc || 'No description.'}</p>}
    </li>
  );
}

interface Props {
  res: CombatResources | undefined;
  view: StatblockView | null;
  loading: boolean;
  error: string;
  onChange: (res: CombatResources) => void;
}

// The DM's quick controls for one creature: the turn's action economy,
// legendary actions, spell slots and every action with its uses and recharges.
export default function ActionsManager({ res, view, loading, error, onChange }: Props) {
  const legendaryUsed = res?.legendaryUsed ?? 0;
  const pool = view?.legendaryPool ?? 0;
  const poolLeft = Math.max(0, pool - legendaryUsed);
  const reactions = view?.actions.filter((a) => a.group === 'reaction') ?? [];
  const legendary = view?.actions.filter((a) => a.group === 'legendary') ?? [];
  const reactionUsed = !!res?.econ?.reaction;
  const slotLevels = Object.keys(view?.slots ?? {}).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="theatre__mgr">
      <div className="theatre__econ" role="group" aria-label="This turn">
        {ECON.map((e) => (
          <button
            key={e.key}
            type="button"
            className={`theatre__chip ${res?.econ?.[e.key] ? 'is-used' : ''}`}
            aria-pressed={!!res?.econ?.[e.key]}
            onClick={() => onChange(toggleEcon(res, e.key))}
          >
            {e.label}
          </button>
        ))}
      </div>

      {loading && <p className="theatre__mgr-note">Loading stat block…</p>}
      {error && <p className="theatre__mgr-note is-error">{error}</p>}
      {!loading && !error && !view && <p className="theatre__mgr-note">A blank combatant has no actions to track. Search the beasts or NPCs to get a stat block.</p>}

      {reactions.length > 0 && (
        <section className={`theatre__alert theatre__alert--reaction ${reactionUsed ? 'is-used' : ''}`} aria-label="Reaction">
          <header>
            <strong>↩ Reaction</strong>
            <span>{reactionUsed ? 'USED · back on its turn' : 'AVAILABLE · 1 per round'}</span>
          </header>
          <ul>
            {reactions.map((a) => (
              <li key={a.key}>
                <b>{a.name}</b>
                {a.summary && <small>{a.summary}</small>}
                {a.desc && <p>{a.desc}</p>}
              </li>
            ))}
          </ul>
          <button type="button" className="theatre__alert-btn" aria-pressed={reactionUsed} onClick={() => onChange(toggleEcon(res, 'reaction'))}>
            {reactionUsed ? 'Reaction used · tap to undo' : 'Use reaction'}
          </button>
        </section>
      )}

      {pool > 0 && (
        <section className={`theatre__alert theatre__alert--legendary ${poolLeft === 0 ? 'is-used' : ''}`} aria-label="Legendary actions">
          <header>
            <strong>★ Legendary actions</strong>
            <span>{poolLeft} of {pool} left · after another creature’s turn · refills on its own turn</span>
          </header>
          <Pips total={pool} used={legendaryUsed} label="Legendary actions" onChange={(d) => onChange(adjustLegendary(res, d, pool))} />
          <ul>
            {legendary.map((a) => (
              <li key={a.key}>
                <span className="theatre__alert-text">
                  <b>{a.name}</b>
                  {a.summary && <small>{a.summary}</small>}
                  {a.desc && <p>{a.desc}</p>}
                </span>
                <button
                  type="button"
                  className="theatre__alert-btn"
                  disabled={(a.cost ?? 1) > poolLeft}
                  onClick={() => onChange(adjustLegendary(res, a.cost ?? 1, pool))}
                  title={(a.cost ?? 1) > poolLeft ? 'Not enough legendary actions left' : undefined}
                >
                  Use{(a.cost ?? 1) > 1 ? ` (${a.cost})` : ''}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view && slotLevels.length > 0 && (
        <div className="theatre__mgr-row theatre__mgr-slots">
          <span className="theatre__mgr-label">Spell slots</span>
          {slotLevels.map((lvl) => (
            <span key={lvl} className="theatre__slot">
              <em>{ORDINAL[Number(lvl)] ?? lvl}</em>
              <Pips
                total={view.slots[lvl]}
                used={res?.slotsUsed?.[lvl] ?? 0}
                label={`${ORDINAL[Number(lvl)] ?? lvl} level slots`}
                onChange={(d) => onChange(adjustSlot(res, lvl, d, view.slots[lvl]))}
              />
            </span>
          ))}
        </div>
      )}

      {view && GROUP_ORDER.filter((g) => g.key !== 'reaction' && g.key !== 'legendary').map(({ key, label }) => {
        const rows = view.actions.filter((a) => a.group === key);
        if (rows.length === 0) return null;
        return (
          <section key={key} className="theatre__mgr-group">
            <h4>{label}</h4>
            <ul>
              {rows.map((a) => (
                <ActionRow key={a.key} action={a} res={res} poolLeft={poolLeft} onChange={onChange} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
