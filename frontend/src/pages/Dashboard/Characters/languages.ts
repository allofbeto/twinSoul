// 5e languages. Standard ones are common in most worlds; exotic ones belong to
// planes, monsters and far-off peoples. Race-specific tongues come from race data.

export const STANDARD_LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'];

export const EXOTIC_LANGUAGES = [
  'Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon',
  'Aquan', 'Auran', 'Ignan', 'Terran',
];

// Secret languages taught by a class rather than learned freely.
export const CLASS_LANGUAGES: Record<string, string> = {
  rogue: "Thieves' Cant",
  druid: 'Druidic',
};

export const ALL_LANGUAGES = [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES];

const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4 };

// "one extra language of your choice", "two more languages of your choice",
// "Learn one language" → how many the player picks.
export const countLanguageChoices = (texts: (string | null | undefined)[]) =>
  texts.reduce((total, raw) => {
    const text = (raw || '').replace(/\s+/g, ' ');
    const m =
      text.match(/\b(a|an|one|two|three|four) (?:extra |more |additional |other )?languages?\b[^.]*\bof your choice/i) ||
      text.match(/\blearn (a|an|one|two|three|four) (?:extra |more |additional )?languages?\b/i);
    return total + (m ? NUMBERS[m[1].toLowerCase()] : 0);
  }, 0);
