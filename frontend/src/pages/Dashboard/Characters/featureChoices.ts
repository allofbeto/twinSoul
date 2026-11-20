// Which menus a character gets to pick from (fighting styles, invocations,
// metamagic...), how many picks each one allows, and what the picks add to the
// rest of the sheet. Pure, like sheetRules.

import { SheetAction } from './actionTypes';
import { CharClass, getClassLevelData } from './classTypes';
import { CharacterFeat } from './featTypes';
import { FeatureOption, OPTION_GROUPS, OptionGroup, findOption } from './featureOptions';
import { ClassEntry } from './sheetRules';

/** One option a character has taken. */
export interface CharacterChoice {
  id: string;
  group: OptionGroup;
  /** Catalog index, or "custom-..." for the table's own. */
  index: string;
  name: string;
  /** Where the pick came from: "class:fighter", "feat:eldritch-adept", "other". */
  source: string;
  /** The table's own options carry their text here. */
  desc?: string;
}

/** A menu the character picks from, and how many picks it allows. */
export interface ChoiceSlot {
  key: string; // `${source}:${group}`
  source: string;
  sourceLabel: string;
  group: OptionGroup;
  total: number;
}

export const newChoiceId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const slotKey = (source: string, group: string) => `${source}:${group}`;

// class_specific counters that are really "options known".
const KNOWN_FIELDS: { field: string; group: OptionGroup }[] = [
  { field: 'invocations_known', group: 'invocation' },
  { field: 'metamagic_known', group: 'metamagic' },
  { field: 'infusions_known', group: 'infusion' },
];

// Battle Master: maneuvers known by fighter level.
const maneuversKnown = (level: number) => (level >= 15 ? 9 : level >= 10 ? 7 : level >= 7 ? 5 : level >= 3 ? 3 : 0);

// Feats that hand out picks from a class's menu.
const FEAT_CHOICES: Record<string, { group: OptionGroup; total: number }> = {
  'fighting-initiate': { group: 'fighting-style', total: 1 },
  'eldritch-adept': { group: 'invocation', total: 1 },
  'metamagic-adept': { group: 'metamagic', total: 2 },
  'martial-adept': { group: 'maneuver', total: 2 },
};

/** Features the class and subclass have handed out so far whose name matches. */
const countFeatures = (cls: CharClass, level: number, subclassIndex: string | null, pattern: RegExp) => {
  const sub = cls.subclasses.find((s) => s.index === subclassIndex);
  const names = [
    ...cls.levels.filter((l) => l.level <= level).flatMap((l) => l.features),
    ...(sub?.levels.filter((l) => l.level <= level).flatMap((l) => l.features) || []),
  ].map((f) => f.name);
  return names.filter((n) => pattern.test(n)).length;
};

/**
 * Read off the class data rather than a list of class names, so homebrew and
 * published classes with a "Fighting Style" feature or an invocations column
 * get the same menus.
 */
export const choiceSlots = (entries: ClassEntry[], feats: CharacterFeat[]): ChoiceSlot[] => {
  const out: ChoiceSlot[] = [];
  const add = (source: string, sourceLabel: string, group: OptionGroup, total: number) => {
    if (total > 0) out.push({ key: slotKey(source, group), source, sourceLabel, group, total });
  };

  entries.forEach(({ cls, summary }) => {
    const source = `class:${cls.index}`;
    const { level, subclass_index: sub } = summary;
    // "Fighting Style" and "Additional Fighting Style", not "Fighting Style: Archery".
    add(source, cls.name, 'fighting-style', countFeatures(cls, level, sub, /^(additional |bonus )?fighting style$/i));
    add(source, cls.name, 'pact-boon', countFeatures(cls, level, sub, /^pact boon$/i));
    const data = getClassLevelData(cls, level)?.class_specific || {};
    KNOWN_FIELDS.forEach(({ field, group }) => add(source, cls.name, group, Number(data[field]) || 0));
    if (sub === 'battle-master') add(source, cls.name, 'maneuver', maneuversKnown(level));
  });

  feats.forEach((f) => {
    const grant = FEAT_CHOICES[f.index];
    // The same feat twice still makes one menu, with room for both.
    const existing = out.find((s) => grant && s.key === slotKey(`feat:${f.index}`, grant.group));
    if (existing) existing.total += grant.total;
    else if (grant) add(`feat:${f.index}`, f.name, grant.group, grant.total);
  });

  return out;
};

export const choicesFor = (slot: ChoiceSlot, choices: CharacterChoice[]) =>
  choices.filter((c) => slotKey(c.source, c.group) === slot.key);

/** Picks that belong to no current menu: the table's extras, or leftovers from a class that changed. */
export const looseChoices = (slots: ChoiceSlot[], choices: CharacterChoice[]) => {
  const keys = new Set(slots.map((s) => s.key));
  return choices.filter((c) => !keys.has(slotKey(c.source, c.group)));
};

/** Picks still to make across every menu. */
export const openChoices = (slots: ChoiceSlot[], choices: CharacterChoice[]) =>
  slots.reduce((n, s) => n + Math.max(0, s.total - choicesFor(s, choices).length), 0);

// ── Prerequisites ────────────────────────────────────────────────────────────

export interface ChoiceContext {
  /** Level in each class, by class index. */
  classLevels: Record<string, number>;
  /** Option indexes already taken. */
  taken: Set<string>;
  /** Slugs of the spells and cantrips the character has. */
  spells: Set<string>;
}

const slug = (name: string) => name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * What the character is missing for this option. Advice, not a lock: tables
 * bend these, so the picker warns and still lets you take it.
 */
export const unmetPrereqs = (option: FeatureOption, ctx: ChoiceContext): string[] => {
  const out: string[] = [];
  const { className, classIndex } = OPTION_GROUPS[option.group];
  if (option.minLevel && classIndex && (ctx.classLevels[classIndex] || 0) < option.minLevel) {
    out.push(`${className} ${option.minLevel}`);
  }
  if (option.needs && !ctx.taken.has(option.needs)) {
    out.push(findOption('pact-boon', option.needs)?.name || option.needs);
  }
  if (option.needsSpell && !ctx.spells.has(slug(option.needsSpell))) out.push(option.needsSpell);
  return out;
};

/** Everything the option asks for, met or not, for the description. */
export const prereqText = (option: FeatureOption): string => {
  const { className } = OPTION_GROUPS[option.group];
  return [
    option.minLevel && className ? `${className} ${option.minLevel}` : '',
    option.needs ? findOption('pact-boon', option.needs)?.name || option.needs : '',
    option.needsSpell || '',
    option.prereq || '',
  ].filter(Boolean).join(', ');
};

// ── What picks add elsewhere ─────────────────────────────────────────────────

/** Options you actively use, as read-only rows for the Actions tab (ids start with "choice:"). */
export const choiceActions = (choices: CharacterChoice[]): SheetAction[] =>
  choices.flatMap((c) => {
    const option = findOption(c.group, c.index);
    if (!option?.timing) return [];
    return [{
      id: `choice:${c.id}`,
      name: option.name,
      kind: option.timing === 'special' ? 'other' as const : option.timing,
      notes: [option.cost, option.summary].filter(Boolean).join(' · '),
      tag: OPTION_GROUPS[option.group].label,
      cost: option.cost,
      description: c.desc || option.summary,
      source: 'choice' as const,
    }];
  });
