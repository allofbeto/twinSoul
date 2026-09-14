import { useState } from 'react';
import type { Combatant, MyCharacter } from './types';

interface PlayerCharacterJoinProps {
  myCharacters: MyCharacter[];
  sharedCombatants: Combatant[];
  onRequestAdd: (characterId: string) => void;
}

// Lets a player put their own PC(s) into the DM's initiative tracker,
// instead of the DM having to know everyone's name/AC/HP by heart. One
// character: a single button. More than one: pick which are in this fight.
export default function PlayerCharacterJoin({
  myCharacters, sharedCombatants, onRequestAdd,
}: PlayerCharacterJoinProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const joinedIds = new Set(
    sharedCombatants.filter((c) => c.characterId).map((c) => c.characterId as string)
  );
  const available = myCharacters.filter((c) => !joinedIds.has(c.id));

  if (available.length === 0) return null;

  if (available.length === 1) {
    const only = available[0];
    return (
      <button
        type="button"
        className="theatre__btn theatre__initiative-join"
        onClick={() => onRequestAdd(only.id)}
      >
        + Add {only.name} to Initiative
      </button>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="theatre__initiative-join theatre__initiative-join--multi">
      <p className="theatre__roll-empty">Which of your characters are in this fight?</p>
      {available.map((c) => (
        <label key={c.id} className="theatre__item-flag">
          <input
            type="checkbox"
            checked={selected.has(c.id)}
            onChange={() => toggle(c.id)}
          />
          {c.name}
        </label>
      ))}
      <button
        type="button"
        className="theatre__btn"
        disabled={selected.size === 0}
        onClick={() => { selected.forEach((id) => onRequestAdd(id)); setSelected(new Set()); }}
      >
        Join Initiative
      </button>
    </div>
  );
}
