import { useState } from 'react';
import { hpDisplay } from './hp';
import { isCritical, useHpFx } from './useHpFx';
import type { Combatant, MyCharacter } from './types';

interface Props {
  combatants: Combatant[];
  turn: number;
  round: number;
  myCharacters: MyCharacter[];
  /** Put one of my characters in the fight, with my own initiative roll when I have one. */
  onJoin: (characterId: string, initiative?: number) => void;
  /** Tell the DM my turn is over. */
  onDone: () => void;
}

// What a player sees and can do about initiative: whose turn it is (and a loud
// "your turn"), the order with the party's HP, joining with their own roll,
// and letting the DM know they're finished. Names arrive already redacted by
// the server, so a hidden creature is just "Unknown Creature" here.
function PlayerHp({ c }: { c: Combatant }) {
  const hp = hpDisplay({ hp: c.hp ?? 0, maxHp: c.maxHp ?? 0, tempHp: c.tempHp });
  const fx = useHpFx(c.hp ?? 0, c.tempHp ?? 0);
  return (
    <span className={`theatre__hpbox ${fx.kind ? `is-${fx.kind}` : ''} ${fx.key % 2 ? 'is-b' : ''} ${isCritical(c.hp ?? 0, c.maxHp ?? 0) ? 'is-critical' : ''}`} title={`${hp.total}/${hp.max} HP${hp.temp ? ` (${hp.temp} temporary)` : ''}`}>
      <span className="theatre__hp-track">
        <span className="theatre__hp-temp" style={{ width: `${hp.totalPercent}%`, opacity: hp.temp > 0 ? 0.85 : 0 }} />
        <span className="theatre__hp-ghost" style={{ width: `${hp.realPercent}%` }} />
        <span className="theatre__hp-fill" style={{ width: `${hp.realPercent}%`, background: hp.color }} />
      </span>
      <span className="theatre__hp-num" style={{ color: hp.color }}>{hp.total}/{hp.max}</span>
    </span>
  );
}

export default function PlayerCombat({ combatants, turn, round, myCharacters, onJoin, onDone }: Props) {
  const [rolls, setRolls] = useState<Record<string, string>>({});
  const [doneSent, setDoneSent] = useState(false);

  const mine = new Set(myCharacters.map((c) => c.id));
  const inFight = new Set(combatants.flatMap((c) => (c.characterId ? [c.characterId] : [])));
  const joinable = myCharacters.filter((c) => !inFight.has(c.id));
  const current = combatants[turn];
  const myTurn = !!current?.characterId && mine.has(current.characterId);
  const next = combatants.length > 1 ? combatants[(turn + 1) % combatants.length] : undefined;
  const myNext = !myTurn && !!next?.characterId && mine.has(next.characterId);

  const join = (id: string) => {
    const n = parseInt(rolls[id] ?? '', 10);
    onJoin(id, Number.isNaN(n) ? undefined : n);
    setRolls((r) => ({ ...r, [id]: '' }));
  };

  const done = () => {
    onDone();
    setDoneSent(true);
    window.setTimeout(() => setDoneSent(false), 4000);
  };

  return (
    <div className="theatre__pcombat">
      <div className="theatre__pcombat-head">
        <h3>Initiative</h3>
        {combatants.length > 0 && <span className="theatre__pcombat-round">Round {round}</span>}
      </div>

      {combatants.length > 0 && (myTurn ? (
        <div className="theatre__yourturn" role="alert">
          <strong>Your turn, {current.name}!</strong>
          <button type="button" className="theatre__btn" onClick={done} disabled={doneSent}>
            {doneSent ? 'DM told ✓' : 'I’m done'}
          </button>
        </div>
      ) : (
        <div className={`theatre__nowup ${myNext ? 'is-next' : ''}`}>
          <small>{myNext ? 'You’re up next' : 'Now up'}</small>
          <strong>{current?.name ?? '—'}</strong>
        </div>
      ))}

      {joinable.length > 0 && (
        <div className="theatre__pjoin">
          <small>{combatants.length > 0 ? 'Join the fight' : 'Combat hasn’t started. Get in the order early:'}</small>
          {joinable.map((c) => (
            <div key={c.id} className="theatre__pjoin-row">
              <span className="theatre__pjoin-name">{c.name}</span>
              <input
                className="theatre__input theatre__input--num"
                inputMode="numeric"
                placeholder="Roll"
                value={rolls[c.id] ?? ''}
                onChange={(e) => setRolls((r) => ({ ...r, [c.id]: e.target.value.replace(/[^\d-]/g, '') }))}
                onKeyDown={(e) => { if (e.key === 'Enter') join(c.id); }}
                aria-label={`Initiative for ${c.name} (leave blank to roll for me)`}
                title="Your initiative. Leave blank and one is rolled for you."
              />
              <button type="button" className="theatre__btn" onClick={() => join(c.id)}>Join</button>
            </div>
          ))}
        </div>
      )}

      {combatants.length === 0 && joinable.length === 0 && (
        <p className="theatre__roll-empty">No combat right now. When your DM starts one, the order shows up here.</p>
      )}

      <ul className="theatre__pcombat-list" aria-label="Turn order">
        {combatants.map((c, i) => {
          const you = !!c.characterId && mine.has(c.characterId);
          const unknown = !c.characterId && !c.revealed;
          return (
            <li
              key={c.id}
              className={`theatre__pcombat-item ${i === turn ? 'is-turn' : ''} ${you ? 'is-you' : ''} ${c.isEnemy && !unknown ? 'is-enemy' : ''} ${unknown ? 'is-unknown' : ''}`}
              aria-current={i === turn ? 'true' : undefined}
            >
              <span className="theatre__init-badge">{c.init}</span>
              <span className="theatre__pcombat-name">
                <strong>{c.name}</strong>
                {you && <em>You</em>}
              </span>
              {c.characterId && (c.maxHp ?? 0) > 0 && <PlayerHp c={c} />}
              {((c.conditions?.length ?? 0) > 0 || (c.exhaustion ?? 0) > 0) && (
                <span className="theatre__pcombat-statuses">
                  {(c.conditions ?? []).map((name) => <span key={name} className="theatre__status theatre__status--ro">{name}</span>)}
                  {(c.exhaustion ?? 0) > 0 && <span className="theatre__status theatre__status--ro">Exhaustion {c.exhaustion}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
