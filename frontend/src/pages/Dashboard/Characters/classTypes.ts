export interface CharClassFeature {
  index: string;
  name: string;
  desc: string[];
}

export interface CharClassLevelSpellcasting {
  cantrips_known?: number;
  spell_slots_level_1?: number;
  spell_slots_level_2?: number;
  spell_slots_level_3?: number;
  spell_slots_level_4?: number;
  spell_slots_level_5?: number;
  spell_slots_level_6?: number;
  spell_slots_level_7?: number;
  spell_slots_level_8?: number;
  spell_slots_level_9?: number;
  [key: string]: number | undefined;
}

export interface CharClassLevel {
  level: number;
  ability_score_bonuses: number;
  prof_bonus: number;
  features: CharClassFeature[];
  spellcasting: CharClassLevelSpellcasting | null;
  class_specific: Record<string, unknown>;
}

export interface CharSubclassLevel {
  level: number;
  features: CharClassFeature[];
}

export interface CharSubclass {
  index: string;
  name: string;
  subclass_flavor: string;
  desc: string[];
  levels: CharSubclassLevel[];
}

export interface CharClass {
  id: string;
  index: string;
  name: string;
  hit_die: number;
  proficiencies: string[];
  proficiency_choices: unknown[];
  saving_throws: string[];
  starting_equipment: unknown[];
  starting_equipment_options: unknown[];
  spellcasting_ability: string | null;
  spellcasting_info: { name: string; desc: string[] }[];
  multi_classing: { prerequisites?: { ability_score: { index: string; name: string }; minimum_score: number }[] };
  subclasses: CharSubclass[];
  levels: CharClassLevel[];
  subclass_choice_level: number | null;
}

// Rough thematic hue per class, purely cosmetic (feeds the CharacterAura
// placeholder). Anything not listed falls back to a neutral arcane violet.
export const CLASS_AURA_HUE: Record<string, number> = {
  barbarian: 8,
  bard: 320,
  cleric: 45,
  druid: 100,
  fighter: 20,
  monk: 175,
  paladin: 50,
  ranger: 130,
  rogue: 260,
  sorcerer: 350,
  warlock: 280,
  wizard: 220,
};

export const getClassAuraHue = (index: string | null | undefined): number =>
  (index ? CLASS_AURA_HUE[index] : undefined) ?? 250;

export interface CharacterClassSummary {
  id: string;
  level: number;
  subclass_index: string | null;
  char_class_index: string | null;
  char_class_name: string | null;
  custom_name: string | null;
}

export const ABILITY_INDEX_TO_KEY: Record<string, string> = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
};

export const getClassLevelData = (cls: CharClass, level: number): CharClassLevel | undefined =>
  cls.levels.find((l) => l.level === level);

export const getFeaturesGainedAt = (cls: CharClass, level: number, subclassIndex?: string | null): CharClassFeature[] => {
  const features = [...(getClassLevelData(cls, level)?.features || [])];
  if (subclassIndex) {
    const subclass = cls.subclasses.find((s) => s.index === subclassIndex);
    const subLevel = subclass?.levels.find((l) => l.level === level);
    if (subLevel) features.push(...subLevel.features);
  }
  return features;
};

export const requiresSubclassChoiceAt = (cls: CharClass, level: number): boolean =>
  cls.subclass_choice_level === level;

export const spellSlotsAt = (cls: CharClass, level: number): CharClassLevelSpellcasting | null =>
  getClassLevelData(cls, level)?.spellcasting || null;
