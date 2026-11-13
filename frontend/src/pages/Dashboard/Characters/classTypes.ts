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
  source?: string; // set on published (non-SRD) subclasses
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
  multi_classing: {
    prerequisites?: { ability_score: { index: string; name: string }; minimum_score: number }[];
    prerequisite_options?: { from?: { options?: { ability_score: { index: string }; minimum_score: number }[] } };
    proficiency_choices?: unknown[];
  };
  source?: string;
  icon?: string | null; // homebrew: borrowed drawn icon
  subclasses: CharSubclass[];
  levels: CharClassLevel[];
  subclass_choice_level: number | null;
  // Homebrew: user_id is the author; SRD rows have user_id null.
  user_id?: string | null;
  homebrew?: boolean;
  source_url?: string | null;
  description?: string | null;
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
  artificer: 35,
  'blood-hunter': 355,
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

// True once the class is at or past its subclass level (the caller checks
// whether one was already chosen), so characters who skipped it still get asked.
export const requiresSubclassChoiceAt = (cls: CharClass, level: number): boolean =>
  !!cls.subclass_choice_level && level >= cls.subclass_choice_level && cls.subclasses.length > 0;

// The class data stores a running count of improvements, so a level grants
// one only when that count goes up.
export const isAsiLevel = (cls: CharClass, level: number): boolean => {
  const now = getClassLevelData(cls, level)?.ability_score_bonuses || 0;
  const before = getClassLevelData(cls, level - 1)?.ability_score_bonuses || 0;
  return now > before;
};

export const asiLevelsUpTo = (cls: CharClass, level: number): number[] =>
  Array.from({ length: Math.max(0, level) }, (_, i) => i + 1).filter((l) => isAsiLevel(cls, l));

// Per-level class numbers (Sneak Attack dice, rages, ki...) as readable chips.
const RESOURCE_LABELS: Record<string, string> = {
  rage_count: 'Rages',
  rage_damage_bonus: 'Rage damage',
  brutal_critical_dice: 'Brutal Critical dice',
  bardic_inspiration_die: 'Bardic Inspiration',
  song_of_rest_die: 'Song of Rest',
  channel_divinity_charges: 'Channel Divinity',
  destroy_undead_cr: 'Destroy Undead CR',
  wild_shape_max_cr: 'Wild Shape max CR',
  action_surges: 'Action Surge',
  extra_attacks: 'Attacks per action',
  indomitable_uses: 'Indomitable',
  ki_points: 'Ki points',
  martial_arts: 'Martial Arts',
  unarmored_movement: 'Unarmored movement',
  aura_range: 'Aura range',
  favored_enemies: 'Favored enemies',
  favored_terrain: 'Favored terrain',
  sneak_attack: 'Sneak Attack',
  sorcery_points: 'Sorcery points',
  metamagic_known: 'Metamagic',
  invocations_known: 'Invocations',
  arcane_recovery_levels: 'Arcane Recovery',
  infusions_known: 'Infusions known',
  infused_items: 'Infused items',
  hemocraft_die: 'Hemocraft die',
  crimson_rites_known: 'Crimson Rites',
  blood_maledict_uses: 'Blood Maledict',
};

const formatCr = (cr: number) => (cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : cr === 0.125 ? '1/8' : `${cr}`);

export const classResources = (cls: CharClass, level: number): { label: string; value: string }[] => {
  const data = getClassLevelData(cls, level)?.class_specific || {};
  const out: { label: string; value: string }[] = [];
  Object.entries(data).forEach(([key, raw]) => {
    const label = RESOURCE_LABELS[key];
    if (!label) return;
    const v: any = raw;
    if (v === null || v === undefined || v === 0 || v === false) return;
    let value: string;
    if (typeof v === 'object' && 'dice_count' in v) value = `${v.dice_count}d${v.dice_value}`;
    else if (typeof v === 'object' && 'dice_value' in v) value = `d${v.dice_value}`;
    else if (typeof v === 'object') return;
    else if (key.endsWith('_die')) value = `d${v}`;
    else if (key === 'extra_attacks') value = `${Number(v) + 1}`;
    else if (key === 'rage_damage_bonus') value = `+${v}`;
    else if (key.endsWith('_cr')) value = formatCr(Number(v));
    else if (key === 'unarmored_movement' || key === 'aura_range') value = `${v} ft`;
    else value = `${v}`;
    out.push({ label, value });
  });
  return out;
};

export const spellSlotsAt = (cls: CharClass, level: number): CharClassLevelSpellcasting | null =>
  getClassLevelData(cls, level)?.spellcasting || null;
