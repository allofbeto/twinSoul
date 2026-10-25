export interface AbilityBonus {
  ability_score: string;
  bonus: number;
}

export interface RaceTrait {
  index: string;
  name: string;
  desc: string[];
}

export interface Subrace {
  index: string;
  name: string;
  desc: string;
  ability_bonuses: AbilityBonus[];
  racial_traits: RaceTrait[];
}

export interface CharRace {
  id: string;
  game: string;
  index: string;
  name: string;
  speed: number;
  size: string;
  size_description: string;
  age: string;
  alignment: string;
  language_desc: string;
  languages: string[];
  ability_bonuses: AbilityBonus[];
  traits: RaceTrait[];
  subraces: Subrace[];
}

// Simple emoji glyphs so the picker feels like a game without needing an
// art pipeline. Fall back to a generic icon for anything not listed here
// (homebrew races, future systems).
export const RACE_ICONS: Record<string, string> = {
  human: '🧑',
  elf: '🧝',
  dwarf: '🧔',
  halfling: '🍀',
  gnome: '🎩',
  'half-elf': '🧝‍♂️',
  'half-orc': '👹',
  tiefling: '😈',
  dragonborn: '🐉',
};

export const getRaceIcon = (index: string) => RACE_ICONS[index] || '❓';
