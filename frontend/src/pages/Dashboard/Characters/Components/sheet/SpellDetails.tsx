import React from 'react';
import { Spell } from '../../spellTypes';

// What a spell does, laid out to be read: key facts first, then the text.
// Shared by the Spells tab and the Actions tab.
const SpellBody = ({ spell, notes }: { spell?: Spell; notes?: string }) => {
  if (!spell) return <p className="sheet-spell-text">{notes || 'No details yet.'}</p>;
  const facts = [
    ['Casting time', spell.casting_time],
    ['Range', spell.range],
    ['Components', spell.components.join(', ')],
    ['Duration', spell.duration],
  ].filter((f): f is [string, string] => !!f[1]);
  return (
    <>
      <dl className="sheet-spell-facts">
        {facts.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {spell.material && <p className="sheet-spell-material"><b>Materials:</b> {spell.material}</p>}
      <div className="sheet-spell-text">
        {spell.desc.map((d, i) => <p key={i}>{d}</p>)}
      </div>
      {spell.higher_level.length > 0 && (
        <div className="sheet-spell-higher">
          <b>At higher levels</b>
          {spell.higher_level.map((d, i) => <p key={i}>{d}</p>)}
        </div>
      )}
    </>
  );
};

export default SpellBody;
