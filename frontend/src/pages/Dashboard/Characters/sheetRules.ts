// 5e numbers the character sheet derives from what's stored: saves, skills,
// initiative, hit dice, spell slots, class resources, and what a rest restores.
// Everything here is pure, so the sheet's panels all agree with each other.

import { DND_SKILLS } from './constants';
import { ABILITY_INDEX_TO_KEY, CharClass, CharacterClassSummary, getClassLevelData } from './classTypes';
import { CharacterFeat } from './featTypes';

export type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
export type AbilityScoreSet = Record<AbilityKey, number>;

export const ABILITY_KEYS: AbilityKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export const ABILITY_SHORT: Record<AbilityKey, string> = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
};

// ── Table overrides ──────────────────────────────────────────────────────────
// Every table has its own rules, so anything the sheet works out can be
// replaced by hand. Keys: "initiative", "proficiency_bonus", "passive:Perception",
// "save:strength", "saveprof:strength" (1/0), "skill:Stealth", "hitdice:d10",
// "slots:1" / "slots:pact", "resource:fighter:action_surges".
export type Overrides = Record<string, number>;

export const overridden = (overrides: Overrides | undefined, key: string, auto: number) => {
  const v = overrides?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : auto;
};

/** Sets or clears one override (clearing when it matches the calculated value). */
export const setOverride = (overrides: Overrides | undefined, key: string, value: number | null, auto?: number): Overrides => {
  const next = { ...(overrides || {}) };
  if (value === null || value === auto) delete next[key];
  else next[key] = value;
  return next;
};

export const abilityMod = (score: number) => Math.floor(((score || 10) - 10) / 2);
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** A character's classes paired with their reference data, starting class first. */
export interface ClassEntry {
  summary: CharacterClassSummary;
  cls: CharClass;
}

export const pairClasses = (summaries: CharacterClassSummary[], classes: CharClass[]): ClassEntry[] =>
  summaries.flatMap((summary) => {
    const cls = classes.find((c) => c.index === summary.char_class_index);
    return cls ? [{ summary, cls }] : [];
  });

// ── Saving throws ────────────────────────────────────────────────────────────

/** Multiclassing only grants the starting class's saves; Resilient adds one. */
export const savingThrowProficiencies = (entries: ClassEntry[], feats: CharacterFeat[]): Set<AbilityKey> => {
  const out = new Set<AbilityKey>();
  entries[0]?.cls.saving_throws.forEach((code) => {
    const key = ABILITY_INDEX_TO_KEY[code] as AbilityKey | undefined;
    if (key) out.add(key);
  });
  feats.forEach((f) => {
    if (f.index === 'resilient' && f.ability) {
      const key = ABILITY_INDEX_TO_KEY[f.ability] as AbilityKey | undefined;
      if (key) out.add(key);
    }
  });
  return out;
};

/** A save's proficiency: the class rule, unless the table set it by hand. */
export const isSaveProficient = (key: AbilityKey, auto: Set<AbilityKey>, overrides?: Overrides) => {
  const v = overrides?.[`saveprof:${key}`];
  return v === undefined ? auto.has(key) : v === 1;
};

// ── Skills ───────────────────────────────────────────────────────────────────

export type SkillRank = 'none' | 'half' | 'proficient' | 'expertise';

const classLevel = (entries: ClassEntry[], index: string) =>
  entries.find((e) => e.cls.index === index)?.summary.level || 0;

/** Bard 2+: Jack of All Trades adds half proficiency to anything not proficient. */
export const hasJackOfAllTrades = (entries: ClassEntry[]) => classLevel(entries, 'bard') >= 2;

export const skillRank = (skill: string, skills: string[], expertise: string[], jackOfAllTrades: boolean): SkillRank => {
  if (expertise.includes(skill)) return 'expertise';
  if (skills.includes(skill)) return 'proficient';
  return jackOfAllTrades ? 'half' : 'none';
};

export const rankBonus = (rank: SkillRank, pb: number) =>
  rank === 'expertise' ? pb * 2 : rank === 'proficient' ? pb : rank === 'half' ? Math.floor(pb / 2) : 0;

export const skillBonus = (skill: string, scores: AbilityScoreSet, skills: string[], expertise: string[], pb: number, jack: boolean) => {
  const def = DND_SKILLS.find((s) => s.name === skill);
  const mod = def ? abilityMod(scores[def.ability as AbilityKey]) : 0;
  return mod + rankBonus(skillRank(skill, skills, expertise, jack), pb);
};

export const passiveScore = (skill: string, scores: AbilityScoreSet, skills: string[], expertise: string[], pb: number, jack: boolean) =>
  10 + skillBonus(skill, scores, skills, expertise, pb, jack);

// ── Combat numbers ───────────────────────────────────────────────────────────

/** DEX, plus Alert's +5 (and Jack of All Trades, since initiative is a DEX check). */
export const initiativeBonus = (scores: AbilityScoreSet, feats: CharacterFeat[], pb: number, jack: boolean) =>
  abilityMod(scores.dexterity)
  + (feats.some((f) => f.index === 'alert') ? 5 : 0)
  + (jack ? Math.floor(pb / 2) : 0);

export const walkingSpeed = (override: number | null | undefined, raceSpeed: number | null | undefined) =>
  override ?? raceSpeed ?? 30;

// ── Hit dice ─────────────────────────────────────────────────────────────────

export interface HitDiePool {
  die: string; // "d10"
  size: number;
  total: number;
  autoTotal: number;
  used: number;
}

/** One pool per die size, biggest first (multiclass can mix sizes). */
export const hitDicePools = (entries: ClassEntry[], used: Record<string, number>, overrides?: Overrides): HitDiePool[] => {
  const totals: Record<number, number> = {};
  entries.forEach(({ cls, summary }) => {
    totals[cls.hit_die] = (totals[cls.hit_die] || 0) + summary.level;
  });
  return Object.entries(totals)
    .map(([size, total]) => {
      const die = `d${size}`;
      const t = Math.max(0, overridden(overrides, `hitdice:${die}`, total));
      return { die, size: Number(size), total: t, autoTotal: total, used: Math.min(used[die] || 0, t) };
    })
    .sort((a, b) => b.size - a.size);
};

// ── Spell slots ──────────────────────────────────────────────────────────────

// Multiclass spellcaster table (PHB p.165): slots per spell level by caster level.
const MULTICLASS_SLOTS: number[][] = [
  [],
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// Subclasses that turn a non-caster into a third caster.
const THIRD_CASTER_SUBCLASSES = new Set(['eldritch-knight', 'arcane-trickster']);

type CasterKind = 'full' | 'half' | 'half-up' | 'third' | 'pact' | null;

const highestSlotAt20 = (cls: CharClass) => {
  const sc = getClassLevelData(cls, 20)?.spellcasting;
  if (!sc) return 0;
  for (let lvl = 9; lvl >= 1; lvl -= 1) if (sc[`spell_slots_level_${lvl}`]) return lvl;
  return 0;
};

/** Read off the class's own table, so homebrew casters slot in too. */
const casterKind = (entry: ClassEntry): CasterKind => {
  const { cls, summary } = entry;
  if (cls.index === 'warlock') return 'pact';
  const top = highestSlotAt20(cls);
  if (top >= 9) return 'full';
  if (top === 5) return getClassLevelData(cls, 1)?.spellcasting?.spell_slots_level_1 ? 'half-up' : 'half';
  if (top === 4) return 'third';
  if (summary.subclass_index && THIRD_CASTER_SUBCLASSES.has(summary.subclass_index)) return 'third';
  return null;
};

export interface SlotLevel {
  key: string; // "1".."9" or "pact"
  label: string;
  total: number;
  autoTotal: number;
  used: number;
  /** Pact slots are all one level; shown in the label. */
  slotLevel: number;
}

const ownSlots = (cls: CharClass, level: number): number[] => {
  const sc = getClassLevelData(cls, level)?.spellcasting;
  if (!sc) return [];
  return Array.from({ length: 9 }, (_, i) => sc[`spell_slots_level_${i + 1}`] || 0);
};

export const spellSlotLevels = (entries: ClassEntry[], used: Record<string, number>, overrides?: Overrides): SlotLevel[] => {
  const casters = entries.map((e) => ({ e, kind: casterKind(e) })).filter((c) => c.kind);
  const slotCasters = casters.filter((c) => c.kind !== 'pact');

  let slots: number[] = [];
  if (slotCasters.length === 1) {
    const { e, kind } = slotCasters[0];
    slots = kind === 'third' && !ownSlots(e.cls, e.summary.level).some(Boolean)
      // Subclass casters (Eldritch Knight...) have no slots in the class table.
      ? MULTICLASS_SLOTS[Math.ceil(e.summary.level / 3)] || []
      : ownSlots(e.cls, e.summary.level);
  } else if (slotCasters.length > 1) {
    const casterLevel = slotCasters.reduce((sum, { e, kind }) => {
      const lvl = e.summary.level;
      if (kind === 'full') return sum + lvl;
      if (kind === 'half') return sum + Math.floor(lvl / 2);
      if (kind === 'half-up') return sum + Math.ceil(lvl / 2);
      return sum + Math.floor(lvl / 3);
    }, 0);
    slots = MULTICLASS_SLOTS[Math.min(casterLevel, 20)] || [];
  }

  // Levels the table gave slots to by hand count too.
  const out: SlotLevel[] = Array.from({ length: 9 }, (_, i) => slots[i] || 0)
    .map((total, i) => ({ key: `${i + 1}`, label: `${ordinal(i + 1)}`, total, autoTotal: total, used: 0, slotLevel: i + 1 }))
    .filter((s) => s.total > 0 || overrides?.[`slots:${s.key}`] !== undefined);

  const pact = casters.find((c) => c.kind === 'pact');
  if (pact) {
    const pactSlots = ownSlots(pact.e.cls, pact.e.summary.level);
    const level = pactSlots.findIndex((n) => n > 0) + 1;
    if (level > 0) out.push({ key: 'pact', label: `Pact (${ordinal(level)})`, total: pactSlots[level - 1], autoTotal: pactSlots[level - 1], used: 0, slotLevel: level });
  }

  return out.map((s) => {
    const total = Math.max(0, overridden(overrides, `slots:${s.key}`, s.total));
    return { ...s, total, used: Math.min(used[s.key] || 0, total) };
  });
};

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

// ── Class resources ──────────────────────────────────────────────────────────

export type Recharge = 'short' | 'long';

export interface TrackedResource {
  key: string; // "barbarian:rage_count"
  label: string;
  total: number;
  autoTotal: number;
  used: number;
  recharge: Recharge;
}

// class_specific counters worth ticking off at the table, and when they come back.
const COUNTERS: Record<string, { label: string; recharge: Recharge }> = {
  rage_count: { label: 'Rage', recharge: 'long' },
  channel_divinity_charges: { label: 'Channel Divinity', recharge: 'short' },
  action_surges: { label: 'Action Surge', recharge: 'short' },
  indomitable_uses: { label: 'Indomitable', recharge: 'long' },
  ki_points: { label: 'Ki', recharge: 'short' },
  sorcery_points: { label: 'Sorcery Points', recharge: 'long' },
  blood_maledict_uses: { label: 'Blood Maledict', recharge: 'short' },
};

/** class_specific keys shown as trackers rather than plain numbers. */
export const TRACKED_COUNTER_KEYS = new Set(Object.keys(COUNTERS));

/** Counters past this are "unlimited" in the data (e.g. a level 20 barbarian's rages). */
const UNLIMITED = 99;

export const trackedResources = (entries: ClassEntry[], scores: AbilityScoreSet, used: Record<string, number>, overrides?: Overrides): TrackedResource[] => {
  const out: Omit<TrackedResource, 'used' | 'autoTotal'>[] = [];
  entries.forEach(({ cls, summary }) => {
    const data = getClassLevelData(cls, summary.level)?.class_specific || {};
    Object.entries(COUNTERS).forEach(([field, { label, recharge }]) => {
      const n = Number(data[field]);
      if (n > 0 && n < UNLIMITED) out.push({ key: `${cls.index}:${field}`, label, total: n, recharge });
    });
    if (cls.index === 'bard' && data.bardic_inspiration_die) {
      out.push({
        key: 'bard:bardic_inspiration',
        label: 'Bardic Inspiration',
        total: Math.max(1, abilityMod(scores.charisma)),
        // Font of Inspiration (bard 5) makes it a short-rest resource.
        recharge: summary.level >= 5 ? 'short' : 'long',
      });
    }
    if (cls.index === 'druid' && summary.level >= 2) {
      out.push({ key: 'druid:wild_shape', label: 'Wild Shape', total: 2, recharge: 'short' });
    }
    if (summary.subclass_index === 'battle-master' && summary.level >= 3) {
      const lvl = summary.level;
      out.push({
        key: `${cls.index}:superiority_dice`,
        label: `Superiority Dice (d${lvl >= 18 ? 12 : lvl >= 10 ? 10 : 8})`,
        total: lvl >= 15 ? 6 : lvl >= 7 ? 5 : 4,
        recharge: 'short',
      });
    }
    if (cls.index === 'wizard' && data.arcane_recovery_levels) {
      out.push({ key: 'wizard:arcane_recovery', label: 'Arcane Recovery', total: 1, recharge: 'long' });
    }
  });
  return out.map((r) => {
    const total = Math.max(0, overridden(overrides, `resource:${r.key}`, r.total));
    return { ...r, total, autoTotal: r.total, used: Math.min(used[r.key] || 0, total) };
  });
};

// ── House-rule trackers ─────────────────────────────────────────────────────

export interface CustomTracker {
  id: string;
  label: string;
  total: number;
  used: number;
  recharge: Recharge | 'none';
}

/** What a rest gives back to the table's own counters. */
export const restCustomTrackers = (trackers: CustomTracker[], kind: Recharge): CustomTracker[] =>
  trackers.map((t) => (t.recharge === 'short' || (kind === 'long' && t.recharge === 'long') ? { ...t, used: 0 } : t));

// ── Rests ────────────────────────────────────────────────────────────────────

export interface PlayState {
  current_hp: number;
  max_hp: number;
  temp_hp: number;
  death_save_successes: number;
  death_save_failures: number;
  hit_dice_used: Record<string, number>;
  spell_slots_used: Record<string, number>;
  resources_used: Record<string, number>;
}

/** Short rest: warlock slots and short-rest resources come back. Hit dice are spent separately. */
export const shortRestChanges = (state: PlayState, resources: TrackedResource[]): Partial<PlayState> => {
  const shortKeys = new Set(resources.filter((r) => r.recharge === 'short').map((r) => r.key));
  const resources_used = Object.fromEntries(Object.entries(state.resources_used).filter(([k]) => !shortKeys.has(k)));
  const { pact, ...spell_slots_used } = state.spell_slots_used;
  return { resources_used, spell_slots_used };
};

/** Long rest: full HP, every slot and resource, and half your hit dice (at least one) back. */
export const longRestChanges = (state: PlayState, pools: HitDiePool[]): Partial<PlayState> => {
  const totalDice = pools.reduce((n, p) => n + p.total, 0);
  let toRegain = Math.max(1, Math.floor(totalDice / 2));
  const hit_dice_used: Record<string, number> = {};
  pools.forEach((p) => {
    const back = Math.min(p.used, toRegain);
    toRegain -= back;
    if (p.used - back > 0) hit_dice_used[p.die] = p.used - back;
  });
  return {
    current_hp: state.max_hp,
    temp_hp: 0,
    death_save_successes: 0,
    death_save_failures: 0,
    hit_dice_used,
    spell_slots_used: {},
    resources_used: {},
  };
};

/** Damage eats temporary HP first. */
export const applyDamage = (state: Pick<PlayState, 'current_hp' | 'temp_hp'>, amount: number) => {
  const fromTemp = Math.min(state.temp_hp, amount);
  return { temp_hp: state.temp_hp - fromTemp, current_hp: Math.max(0, state.current_hp - (amount - fromTemp)) };
};

/** Healing can't pass max HP; any healing clears death saves. */
export const applyHealing = (state: Pick<PlayState, 'current_hp' | 'max_hp'>, amount: number) => ({
  current_hp: Math.min(state.max_hp, state.current_hp + amount),
  death_save_successes: 0,
  death_save_failures: 0,
});
