// Who can cast what: works out every source of spells a character has
// (classes, subclasses, race, feats, plus "other" for whatever the table
// grants), how many cantrips and spells each one allows, and which spells
// each can choose from. Pure, so the builder and the sheet agree.

import { ABILITY_INDEX_TO_KEY, CharClass, getClassLevelData } from './classTypes';
import { CharacterFeat } from './featTypes';
import { OPTION_GROUPS, findOption } from './featureOptions';
import { AbilityKey, AbilityScoreSet, ClassEntry, Overrides, SlotLevel, abilityMod, overridden } from './sheetRules';
import { CharacterSpell, Spell, slugify } from './spellTypes';
import {
  FEAT_SPELLS, RACE_SPELLS, SUBCLASS_EXTRA_LISTS, SUBCLASS_SPELLS, THIRD_CASTERS, THIRD_CASTER_KNOWN,
} from './spellGrants';

export type SpellMode =
  | 'known' // learns a fixed number of spells (Bard, Sorcerer, Warlock, Ranger…)
  | 'prepared' // prepares from the whole list each day (Cleric, Druid, Paladin, Artificer)
  | 'spellbook' // learns spells into a book, prepares some of them (Wizard)
  | 'pick'; // a fixed handful (races, feats)

export interface SpellGrant {
  name: string;
  index: string;
  /** Who it comes from, e.g. "Life Domain". */
  from: string;
}

export interface SpellSource {
  key: string; // "class:wizard", "race", "feat:magic-initiate", "other"
  label: string;
  kind: 'class' | 'race' | 'feat' | 'other';
  mode: SpellMode;
  ability?: AbilityKey;
  /** Class lists the choices come from ([] with no extras = nothing to choose). */
  lists: string[];
  /** Spells added to the options by name (warlock patrons). */
  extraIndexes: string[];
  /** Highest spell level it can choose. */
  maxLevel: number;
  /** Exactly this spell level for leveled picks (Magic Initiate: 1). */
  spellLevel?: number;
  cantrips: number;
  autoCantrips: number;
  /** Leveled spells known / in the spellbook / to pick. 0 for prepared casters. */
  spells: number;
  autoSpells: number;
  /** How many can be prepared (prepared and spellbook casters). */
  prepares?: number;
  autoPrepares?: number;
  /** Always available, not counted against the limits. */
  granted: SpellGrant[];
  schools?: string[];
  ritualOnly?: boolean;
  attackOnly?: boolean;
  /** No limits at all (the "other" source). */
  unlimited?: boolean;
  hint?: string;
  saveDc?: number;
  autoSaveDc?: number;
  attack?: number;
  autoAttack?: number;
}

export interface SpellSourceInput {
  entries: ClassEntry[];
  raceIndex?: string | null;
  subraceIndex?: string | null;
  feats: CharacterFeat[];
  /** Class options taken (invocations, fighting styles...): some bring spells. */
  choices?: { group: string; index: string }[];
  level: number;
  scores: AbilityScoreSet;
  proficiencyBonus: number;
  overrides?: Overrides;
}

const highestSlot = (cls: CharClass, level: number) => {
  const sc = getClassLevelData(cls, level)?.spellcasting;
  if (!sc) return 0;
  for (let lvl = 9; lvl >= 1; lvl -= 1) if (sc[`spell_slots_level_${lvl}`]) return lvl;
  return 0;
};

const thirdCasterMax = (l: number) => (l >= 19 ? 4 : l >= 13 ? 3 : l >= 7 ? 2 : l >= 3 ? 1 : 0);

const grantsUpTo = (byLevel: Record<number, string[]>, level: number, from: string): SpellGrant[] =>
  Object.entries(byLevel)
    .filter(([at]) => Number(at) <= level)
    .flatMap(([, names]) => names.map((name) => ({ name, index: slugify(name), from })));

const usesSpellsKnown = (cls: CharClass) => cls.levels.some((l) => (l.spellcasting?.spells_known || 0) > 0);

const classSource = ({ cls, summary }: ClassEntry, scores: AbilityScoreSet): SpellSource | null => {
  const level = summary.level;
  const sub = summary.subclass_index || '';
  const third = THIRD_CASTERS[sub];
  const subSpells = SUBCLASS_SPELLS[sub];
  const base = {
    key: `class:${cls.index}`,
    kind: 'class' as const,
    extraIndexes: [] as string[],
    granted: [] as SpellGrant[],
  };

  if (third) {
    if (level < 3) return null;
    const cantrips = level >= 10 ? 3 : 2;
    const spells = THIRD_CASTER_KNOWN[level] || 0;
    return {
      ...base,
      label: `${cls.name} · ${third.label}`,
      mode: 'known',
      ability: third.ability,
      lists: ['wizard'],
      maxLevel: thirdCasterMax(level),
      cantrips, autoCantrips: cantrips, spells, autoSpells: spells,
      granted: sub === 'arcane-trickster' ? [{ name: 'Mage Hand', index: 'mage-hand', from: third.label }] : [],
      hint: third.hint,
    };
  }

  const data = getClassLevelData(cls, level)?.spellcasting;
  if (!cls.spellcasting_ability && !data) return null;
  const ability = ABILITY_INDEX_TO_KEY[cls.spellcasting_ability || ''] as AbilityKey | undefined;
  const maxLevel = highestSlot(cls, level);
  const cantrips = data?.cantrips_known || 0;
  const granted = subSpells?.kind === 'always' ? grantsUpTo(subSpells.spells, level, subSpells.label) : [];
  const extraIndexes = subSpells?.kind === 'expanded'
    ? Object.entries(subSpells.spells).filter(([lvl]) => Number(lvl) <= maxLevel).flatMap(([, names]) => names.map(slugify))
    : [];
  if (!cantrips && !maxLevel && !granted.length) return null;

  const mod = ability ? abilityMod(scores[ability]) : 0;
  const halfCaster = highestSlot(cls, 20) === 5;
  const lists = [cls.index, ...(SUBCLASS_EXTRA_LISTS[sub] || [])];
  const label = subSpells ? `${cls.name} · ${subSpells.label}` : cls.name;

  if (usesSpellsKnown(cls)) {
    const spells = data?.spells_known || 0;
    return { ...base, label, mode: 'known', ability, lists, extraIndexes, maxLevel, cantrips, autoCantrips: cantrips, spells, autoSpells: spells, granted };
  }
  const prepares = maxLevel ? Math.max(1, mod + (halfCaster ? Math.floor(level / 2) : level)) : 0;
  if (cls.index === 'wizard') {
    const book = 6 + 2 * (level - 1);
    return {
      ...base, label, mode: 'spellbook', ability, lists, extraIndexes, maxLevel, cantrips, autoCantrips: cantrips,
      spells: book, autoSpells: book, prepares, autoPrepares: prepares, granted,
      hint: 'Your spellbook holds the spells you know; prepare some of them each day.',
    };
  }
  return {
    ...base, label, mode: 'prepared', ability, lists, extraIndexes, maxLevel, cantrips, autoCantrips: cantrips,
    spells: 0, autoSpells: 0, prepares, autoPrepares: prepares, granted,
    hint: 'You prepare spells from your whole class list after a long rest.',
  };
};

const raceSource = (raceIndex: string | null | undefined, subraceIndex: string | null | undefined, level: number): SpellSource | null => {
  const r = (subraceIndex && RACE_SPELLS[subraceIndex]) || (raceIndex && RACE_SPELLS[raceIndex]);
  if (!r) return null;
  const cantrips = r.pick?.cantrips || 0;
  return {
    key: 'race', label: r.label, kind: 'race', mode: 'pick', ability: r.ability,
    lists: r.pick ? [r.pick.list] : [], extraIndexes: [], maxLevel: 0,
    cantrips, autoCantrips: cantrips, spells: 0, autoSpells: 0,
    granted: r.granted ? grantsUpTo(r.granted, level, r.label) : [],
  };
};

const featSource = (feat: CharacterFeat): SpellSource | null => {
  const f = FEAT_SPELLS[feat.index];
  if (!f) return null;
  const ability = (feat.ability && (ABILITY_INDEX_TO_KEY[feat.ability] as AbilityKey)) || undefined;
  const cantrips = f.cantrips || 0;
  const spells = f.spells || 0;
  return {
    key: `feat:${feat.index}`, label: feat.name, kind: 'feat', mode: 'pick', ability,
    lists: f.lists, extraIndexes: [], maxLevel: f.spellLevel || 1, spellLevel: f.spellLevel,
    cantrips, autoCantrips: cantrips, spells, autoSpells: spells,
    granted: (f.granted || []).map((name) => ({ name, index: slugify(name), from: feat.name })),
    schools: f.schools, ritualOnly: f.ritualOnly, attackOnly: f.attackOnly, hint: f.hint,
  };
};

/**
 * Spells that come with class options: one source for everything cast as-is
 * (Armor of Shadows' Mage Armor...), plus one per option that picks cantrips
 * (Pact of the Tome, Blessed Warrior).
 */
const choiceSources = (choices: { group: string; index: string }[]): SpellSource[] => {
  const options = choices
    .map((c) => findOption(c.group, c.index))
    .filter((o, i, all): o is NonNullable<typeof o> => !!o && all.indexOf(o) === i);
  const base = { kind: 'feat' as const, mode: 'pick' as const, extraIndexes: [], maxLevel: 0, spells: 0, autoSpells: 0 };
  const granted = options.flatMap((o) => (o.spells || []).map((name) => ({ name, index: slugify(name), from: o.name })));
  return [
    ...(granted.length ? [{
      ...base, key: 'options', label: 'Invocations & options', ability: 'charisma' as AbilityKey,
      lists: [], cantrips: 0, autoCantrips: 0, granted,
      hint: 'Each option says how often its spell can be cast.',
    }] : []),
    ...options.filter((o) => o.cantrips).map((o) => ({
      ...base, key: `option:${o.index}`, label: `${o.name} · ${OPTION_GROUPS[o.group].label}`, ability: o.cantrips!.ability,
      lists: o.cantrips!.lists, cantrips: o.cantrips!.count, autoCantrips: o.cantrips!.count, granted: [],
    })),
  ];
};

/** Every source of spells the character has, in sheet order. "other" is always last. */
export const buildSpellSources = (input: SpellSourceInput): SpellSource[] => {
  const { entries, raceIndex, subraceIndex, feats, choices = [], level, scores, proficiencyBonus, overrides } = input;
  const sources: SpellSource[] = [
    ...entries.map((e) => classSource(e, scores)).filter((s): s is SpellSource => !!s),
    ...[raceSource(raceIndex, subraceIndex, level)].filter((s): s is SpellSource => !!s),
    ...feats.map(featSource).filter((s): s is SpellSource => !!s),
    ...choiceSources(choices),
    {
      key: 'other', label: 'Other', kind: 'other', mode: 'pick', lists: [], extraIndexes: [], maxLevel: 9,
      cantrips: 0, autoCantrips: 0, spells: 0, autoSpells: 0, granted: [], unlimited: true,
      hint: 'Spells from a background, a magic item, a boon or your DM.',
    },
  ];

  // Spellcasting numbers, and the table's overrides for every limit.
  return sources.map((s) => {
    const mod = s.ability ? abilityMod(scores[s.ability]) : 0;
    const autoSaveDc = s.ability ? 8 + proficiencyBonus + mod : undefined;
    const autoAttack = s.ability ? proficiencyBonus + mod : undefined;
    const ov = (k: string, auto: number) => Math.max(0, overridden(overrides, `spells:${s.key}:${k}`, auto));
    return {
      ...s,
      cantrips: ov('cantrips', s.autoCantrips),
      spells: ov('spells', s.autoSpells),
      ...(s.autoPrepares !== undefined ? { prepares: ov('prepares', s.autoPrepares) } : {}),
      autoSaveDc,
      autoAttack,
      saveDc: autoSaveDc === undefined ? undefined : overridden(overrides, `spelldc:${s.key}`, autoSaveDc),
      attack: autoAttack === undefined ? undefined : overridden(overrides, `spellatk:${s.key}`, autoAttack),
    };
  });
};

/** Whether a source can take this spell (anyList ignores class lists, for tables that allow it). */
export const canChoose = (source: SpellSource, spell: Pick<Spell, 'index' | 'level' | 'class_indexes' | 'school' | 'ritual' | 'attack_type'>, anyList = false) => {
  if (spell.level === 0 && !source.cantrips && !source.unlimited) return false;
  if (spell.level > 0) {
    const takesLeveled = source.unlimited || source.spells > 0 || (source.prepares || 0) > 0;
    if (!takesLeveled || spell.level > source.maxLevel) return false;
    if (source.spellLevel && spell.level !== source.spellLevel) return false;
    if (source.ritualOnly && !spell.ritual) return false;
  }
  if (source.attackOnly && !spell.attack_type) return false;
  if (source.schools && spell.level > 0 && !source.schools.includes(spell.school || '')) return false;
  if (anyList || source.unlimited) return true;
  if (source.lists.length === 0) return !!source.schools; // school-limited feats draw from every list
  return spell.class_indexes.some((c) => source.lists.includes(c)) || source.extraIndexes.includes(spell.index);
};

export interface SourceUsage {
  cantrips: number;
  spells: number; // leveled spells chosen (known / in book / prepared for prepared casters)
  prepared: number; // spellbook casters: prepared out of the book
}

export const sourceUsage = (source: SpellSource, chosen: CharacterSpell[]): SourceUsage => {
  const mine = chosen.filter((c) => c.source === source.key);
  return {
    cantrips: mine.filter((c) => c.level === 0).length,
    spells: mine.filter((c) => c.level > 0).length,
    prepared: mine.filter((c) => c.level > 0 && c.prepared).length,
  };
};

/** Choices still open, for the builder ("3 left"). Prepared casters prepare later. */
export const choicesLeft = (source: SpellSource, usage: SourceUsage) => {
  if (source.unlimited) return 0;
  const leveledLimit = source.mode === 'prepared' ? 0 : source.spells;
  return Math.max(0, source.cantrips - usage.cantrips) + Math.max(0, leveledLimit - usage.spells);
};

/** Ready to cast: known/picked spells, prepared casters' choices, and prepared spellbook spells. */
export const isReady = (source: SpellSource | undefined, spell: CharacterSpell) =>
  spell.level === 0 || !source || source.mode !== 'spellbook' || !!spell.prepared;

/** The lowest free slot that can cast a spell of this level (pact slots count). */
export const freeSlotFor = (slots: SlotLevel[], level: number) =>
  slots
    .filter((s) => s.slotLevel >= level && s.used < s.total)
    .sort((a, b) => a.slotLevel - b.slotLevel)[0];
