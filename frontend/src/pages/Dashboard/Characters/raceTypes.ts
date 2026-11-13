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
  // Homebrew: user_id is the author; SRD rows have user_id null.
  user_id?: string | null;
  homebrew?: boolean;
  source_url?: string | null;
  description?: string | null;
  // Where an official race comes from, e.g. "SRD 5.1" or "Volo's Guide to Monsters".
  source?: string | null;
  // Homebrew: a borrowed drawn icon (one of RACE_ICON_INDEXES).
  icon?: string | null;
}

// SRD races carry their full open-licensed text; published non-SRD races
// carry only mechanics and twinSoul's own summaries.
export const isCoreRace = (race: Pick<CharRace, 'source' | 'homebrew'>) =>
  !race.homebrew && (!race.source || race.source.startsWith('SRD'));

// Races with a drawn icon in public/race-icons/<index>.png. The PNGs are
// shapes on a transparent background; RaceIcon colours them with the theme.
export const RACE_ICON_INDEXES = new Set([
  'aarakocra', 'aasimar', 'bugbear', 'centaur', 'changeling', 'dragonborn',
  'dwarf', 'elf', 'fairy', 'firbolg', 'genasi', 'gith',
  'gnome', 'goblin', 'goliath', 'grung', 'half-elf', 'half-orc',
  'halfling', 'harengon', 'hobgoblin', 'human', 'kalashtar', 'kenku',
  'kobold', 'leonin', 'lizardfolk', 'locathah', 'loxodon', 'minotaur',
  'orc', 'owlin', 'satyr', 'shifter', 'simic-hybrid', 'tabaxi',
  'tiefling', 'tortle', 'triton', 'vedalken', 'verdan', 'warforged',
  'yuan-ti-pureblood',
]);

// Which drawn icon a race uses: its own, or the one a homebrew race borrowed.
export const raceIconKey = (race: { index: string; icon?: string | null } | undefined | null) =>
  race ? race.icon || race.index : '';

export const raceIconUrl = (index: string) =>
  RACE_ICON_INDEXES.has(index) ? `${process.env.PUBLIC_URL || ''}/race-icons/${index}.png` : null;

// Fallback glyph for races without a drawn icon (homebrew, future systems).
export const raceFallbackGlyph = (index: string) => (index.startsWith('hb-') ? '🧪' : '❓');
