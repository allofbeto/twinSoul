import type { Combatant } from './types';

interface PlayerInitiativeListProps {
  combatants: Combatant[];
  turn: number;
}

// Read-only turn order for players. Names arrive already redacted by the
// server (an unrevealed enemy shows up as "Unknown Creature" — the real
// name never reached this connection at all), so there's nothing to hide
// here beyond just not exposing stats/actions the DM has on their own view.
export default function PlayerInitiativeList({ combatants, turn }: PlayerInitiativeListProps) {
  if (combatants.length === 0) return null;

  return (
    <ul className="theatre__init-list theatre__init-list--player">
      {combatants.map((c, i) => (
        <li
          key={c.id}
          className={`theatre__combatant ${i === turn ? 'is-turn' : ''} ${c.isEnemy ? 'is-enemy' : ''}`}
        >
          <span className="theatre__init-badge">{c.init}</span>
          <span className="theatre__combatant-name">{c.name}</span>
        </li>
      ))}
    </ul>
  );
}
