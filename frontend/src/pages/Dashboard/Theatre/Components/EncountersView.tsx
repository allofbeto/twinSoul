import type { PlannedEncounter } from '../../../../components/sessionNotebook/model';
import type { TheatreEncounter, TheatreEncounterPhase } from './types';

export interface EncounterEntry {
  id: string;
  /** Full encounter, when it still exists in the campaign. */
  encounter: TheatreEncounter | null;
  /** The beat that plans it, if any (otherwise it's just linked to the session). */
  plan: PlannedEncounter | null;
}

interface Props {
  entries: EncounterEntry[];
  selectedId: string | null;
  startedIds: Set<string>;
  onSelect: (id: string) => void;
  onStart: (encounter: TheatreEncounter, phase: TheatreEncounterPhase) => void;
}

const monsterSummary = (p: TheatreEncounterPhase) =>
  p.monsters.map((m) => (m.quantity > 1 ? `${m.quantity}× ${m.name}` : m.name)).join(', ');

// The DM's planned fights for this session. Nothing here reaches the players:
// starting one drops its monsters into Combat as unrevealed enemies.
export default function EncountersView({ entries, selectedId, startedIds, onSelect, onStart }: Props) {
  const current = entries.find((e) => e.id === selectedId) ?? entries[0];

  return (
    <div className="theatre__enc">
      <nav className="theatre__enc-list" aria-label="Planned encounters">
        <div className="theatre__enc-list-head">Planned <span>{entries.length}</span></div>
        {entries.map((e) => {
          const name = e.encounter?.name ?? e.plan?.name ?? 'Encounter';
          const started = startedIds.has(e.id);
          return (
            <button
              key={e.id} type="button"
              className={`theatre__enc-item ${current?.id === e.id ? 'is-on' : ''} ${e.plan?.done ? 'is-done' : ''}`}
              onClick={() => onSelect(e.id)} aria-current={current?.id === e.id}
            >
              <strong>⚔ {name}</strong>
              <span>{e.plan ? `${e.plan.sceneTitle} · ${e.plan.beatTitle}` : 'Linked to this session'}</span>
              {(started || e.plan?.done) && <em>{started ? 'Started' : 'Beat done'}</em>}
            </button>
          );
        })}
      </nav>

      <section className="theatre__enc-detail" aria-label="Encounter details">
        {!current ? null : !current.encounter ? (
          <div className="theatre__enc-empty">
            <strong>{current.plan?.name ?? 'This encounter'}</strong> isn’t in the campaign any more. Link a different one from the beat in the Session tab.
          </div>
        ) : (
          <>
            <header className="theatre__enc-head">
              <h2>{current.encounter.name}</h2>
              <span className="theatre__enc-secret" title="Monsters join Combat hidden. Reveal each one from the Combat tab when the players should see it.">🔒 Secret from players</span>
            </header>
            {current.plan && <p className="theatre__enc-beat">From the beat <strong>{current.plan.beatTitle}</strong> · {current.plan.sceneTitle}</p>}
            {current.encounter.notes && <p className="theatre__enc-notes">{current.encounter.notes}</p>}

            {current.encounter.phases.length === 0 && <div className="theatre__enc-empty">This encounter has no monsters yet.</div>}
            {current.encounter.phases.map((p) => (
              <div key={p.id} className="theatre__enc-phase">
                <div className="theatre__enc-phase-head">
                  <div>
                    {current.encounter!.phases.length > 1 && <h3>{p.name}</h3>}
                    <span>{monsterSummary(p) || 'No monsters'}</span>
                  </div>
                  <button
                    type="button" className="theatre__btn theatre__btn--primary" disabled={p.monsters.length === 0}
                    onClick={() => onStart(current.encounter!, p)}
                  >
                    ⚔ Start{current.encounter!.phases.length > 1 ? ' phase' : ''}
                  </button>
                </div>
                {p.notes && <p className="theatre__enc-notes">{p.notes}</p>}
                <table className="theatre__enc-table">
                  <thead><tr><th>Creature</th><th>Qty</th><th>CR</th><th>AC</th><th>HP</th></tr></thead>
                  <tbody>
                    {p.monsters.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td><td>{m.quantity}</td><td>{m.challengeRating ?? '—'}</td>
                        <td>{m.armorClass ?? '—'}</td><td>{m.maxHp ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="theatre__enc-foot">Starting adds these creatures to Combat with rolled initiative, hidden from players until you reveal them.</p>
          </>
        )}
      </section>
    </div>
  );
}
