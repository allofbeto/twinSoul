// What a DM-controlled creature can do, in one shape whether it came from the
// SRD bestiary or from one of the DM's own NPCs, plus the pure functions for
// spending and resetting its actions and resources during combat.

import { ABILITY_SCORES } from '../../Characters/constants';
import {
  attackBonusOf, checkOf, customRollOf, damageTextOf, modOfScore, proficiencyForCr, saveTextOf, type Feature,
} from '../../Npcs/statblock';
import { parseDefenseEntry, parseDefenseText, type DefenseSet } from './conditions';
import type { CombatResources } from './types';

export type ActionGroup = 'action' | 'bonus' | 'reaction' | 'legendary' | 'trait' | 'spell';

export interface ActionView {
  /** Stable per creature: used to remember what's been spent. */
  key: string;
  group: ActionGroup;
  name: string;
  /** "+5 to hit · 1d8+3 slashing", "DC 14 DEX save"... */
  summary: string;
  desc: string;
  /** Limited uses: "3/day". */
  limit?: { max: number; per: 'day' | 'rest' };
  /** "5–6": spent until it recharges on that roll. */
  recharge?: string;
  /** Legendary actions: how many of the pool one use costs. */
  cost?: number;
}

export interface StatblockView {
  actions: ActionView[];
  /** Spell slots by level. */
  slots: Record<string, number>;
  legendaryPool: number;
  /** Resistances, immunities and vulnerabilities, when the stat block has them. */
  defenses?: DefenseSet;
  /** Defenses text we couldn't sort into the lists above. */
  defenseNote?: string;
}

export const GROUP_ORDER: { key: ActionGroup; label: string }[] = [
  { key: 'action', label: 'Actions' },
  { key: 'bonus', label: 'Bonus actions' },
  { key: 'reaction', label: 'Reactions' },
  { key: 'legendary', label: 'Legendary actions' },
  { key: 'trait', label: 'Traits' },
  { key: 'spell', label: 'Spells' },
];

/** "3/day", "2/rest", "Recharge 5–6" (also "Recharge 6"). */
export const parseUses = (text?: string | null): Pick<ActionView, 'limit' | 'recharge'> => {
  const t = (text || '').trim();
  if (!t) return {};
  const recharge = /recharge\s*(\d)(?:\s*[-–]\s*6)?/i.exec(t);
  if (recharge) return { recharge: recharge[1] === '6' ? '6' : `${recharge[1]}–6` };
  const limited = /(\d+)\s*\/\s*(day|rest|short rest|long rest)/i.exec(t);
  if (limited) return { limit: { max: Number(limited[1]), per: limited[2].toLowerCase() === 'day' ? 'day' : 'rest' } };
  return {};
};

const keyOf = (group: ActionGroup, name: string) => `${group}:${name}`;
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

// ── SRD monsters ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const srdUsage = (usage: Raw): Pick<ActionView, 'limit' | 'recharge'> => {
  if (!usage) return {};
  if (usage.type === 'per day' && usage.times) return { limit: { max: Number(usage.times), per: 'day' } };
  if (usage.type === 'recharge on roll') return { recharge: Number(usage.min_value) >= 6 ? '6' : `${usage.min_value ?? 5}–6` };
  if (usage.type === 'recharge after rest') return { limit: { max: 1, per: 'rest' } };
  return {};
};

const srdSummary = (a: Raw) => {
  const damage = (a.damage || [])
    .filter((d: Raw) => d.damage_dice)
    .map((d: Raw) => `${d.damage_dice}${d.damage_type?.name ? ` ${String(d.damage_type.name).toLowerCase()}` : ''}`)
    .join(' + ');
  return [
    a.attack_bonus != null ? `${signed(Number(a.attack_bonus))} to hit` : '',
    a.dc ? `DC ${a.dc.dc_value} ${a.dc.dc_type?.name ?? ''} save`.trim() : '',
    damage,
  ].filter(Boolean).join(' · ');
};

export const fromMonster = (m: Raw): StatblockView => {
  const actions: ActionView[] = [];
  const push = (group: ActionGroup, a: Raw, extra: Partial<ActionView> = {}) => {
    if (!a?.name) return;
    actions.push({
      key: keyOf(group, a.name), group, name: a.name, summary: srdSummary(a), desc: a.desc ?? '',
      ...srdUsage(a.usage), ...extra,
    });
  };

  (m.actions || []).forEach((a: Raw) => push('action', a));
  (m.reactions || []).forEach((a: Raw) => push('reaction', a));
  (m.legendary_actions || []).forEach((a: Raw) => {
    const cost = /costs?\s+(\d+)\s+actions?/i.exec(a.desc || '');
    push('legendary', a, { cost: cost ? Number(cost[1]) : 1 });
  });

  let slots: Record<string, number> = {};
  (m.special_abilities || []).forEach((a: Raw) => {
    if (a?.spellcasting) {
      slots = Object.fromEntries(Object.entries(a.spellcasting.slots || {}).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number(v) > 0));
      push('spell', a, { summary: a.spellcasting.dc ? `DC ${a.spellcasting.dc}${a.spellcasting.modifier != null ? ` · ${signed(a.spellcasting.modifier)} to hit` : ''}` : '' });
    } else {
      push('trait', a);
    }
  });

  const list = (v: Raw) => (Array.isArray(v) ? v : []).map((x: Raw) => String(typeof x === 'string' ? x : x?.name ?? '')).filter(Boolean);
  const defenses: DefenseSet = {
    resist: list(m.damage_resistances).map(parseDefenseEntry),
    immune: list(m.damage_immunities).map(parseDefenseEntry),
    vulnerable: list(m.damage_vulnerabilities).map(parseDefenseEntry),
    conditionImmune: list(m.condition_immunities),
  };
  return { actions, slots, legendaryPool: actions.some((a) => a.group === 'legendary') ? 3 : 0, defenses };
};

// ── The DM's own NPCs and homebrew monsters ──────────────────────────────────

export const fromNpc = (item: Raw): StatblockView => {
  const mods = Object.fromEntries(ABILITY_SCORES.map((a) => [a.key, modOfScore(item[a.key])]));
  const pb = proficiencyForCr(item.challenge_rating);
  const skills: string[] = item.skills ?? [];

  const summary = (f: Feature) => {
    const bits: string[] = [];
    const atk = attackBonusOf(f, mods, pb);
    if (atk !== null) bits.push(`${signed(atk)} to hit${f.range ? ` · ${f.range}` : ''}`);
    else if (f.range) bits.push(f.range);
    const save = saveTextOf(f, mods, pb);
    if (save) bits.push(`${save} save`);
    const check = checkOf(f, mods, pb, skills);
    if (check) bits.push(`${check.label} ${signed(check.bonus)}`);
    const custom = customRollOf(f);
    if (custom) bits.push(`${custom.label}: ${custom.expr}`);
    const dmg = damageTextOf(f, mods);
    if (dmg) bits.push(dmg);
    return bits.join(' · ');
  };

  const actions: ActionView[] = [];
  const add = (group: ActionGroup, list: Feature[] | undefined) =>
    (list || []).forEach((f) => {
      if (!f?.name) return;
      actions.push({
        key: keyOf(group, f.name), group, name: f.name, summary: summary(f), desc: f.desc ?? '',
        ...parseUses(f.uses),
        ...(group === 'legendary' ? { cost: Number((/costs?\s+(\d+)/i.exec(f.desc || '') || [])[1]) || 1 } : {}),
      });
    });
  add('trait', item.traits);
  add('action', item.actions);
  add('bonus', item.bonus_actions);
  add('reaction', item.reactions);
  add('legendary', item.legendary_actions);

  (item.spells || []).forEach((sp: Raw) => {
    if (!sp?.name) return;
    actions.push({
      key: keyOf('spell', sp.name), group: 'spell', name: sp.name,
      summary: [sp.level === 0 ? 'Cantrip' : `Level ${sp.level}`, sp.concentration ? 'concentration' : ''].filter(Boolean).join(' · '),
      desc: sp.desc ?? '',
      ...(sp.level === 0 ? {} : parseUses(sp.uses)),
    });
  });

  const slots = Object.fromEntries(
    Object.entries(item.spellcasting?.slots || {}).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number(v) > 0),
  ) as Record<string, number>;

  const { defenses, leftover } = parseDefenseText(item.defenses);
  return { actions, slots, legendaryPool: actions.some((a) => a.group === 'legendary') ? 3 : 0, defenses, defenseNote: leftover || undefined };
};

// ── Spending and resetting ───────────────────────────────────────────────────

type Econ = keyof NonNullable<CombatResources['econ']>;

export const toggleEcon = (res: CombatResources | undefined, key: Econ): CombatResources => ({
  ...res,
  econ: { ...res?.econ, [key]: !res?.econ?.[key] },
});

export const usedOf = (res: CombatResources | undefined, key: string) => res?.used?.[key] ?? 0;

/** Spend (+1) or restore (−1) a limited-use or recharge ability, within 0..max. */
export const adjustUsed = (res: CombatResources | undefined, key: string, delta: number, max: number): CombatResources => ({
  ...res,
  used: { ...res?.used, [key]: Math.max(0, Math.min(max, usedOf(res, key) + delta)) },
});

export const adjustSlot = (res: CombatResources | undefined, level: string, delta: number, max: number): CombatResources => ({
  ...res,
  slotsUsed: { ...res?.slotsUsed, [level]: Math.max(0, Math.min(max, (res?.slotsUsed?.[level] ?? 0) + delta)) },
});

export const adjustLegendary = (res: CombatResources | undefined, delta: number, pool: number): CombatResources => ({
  ...res,
  legendaryUsed: Math.max(0, Math.min(pool, (res?.legendaryUsed ?? 0) + delta)),
});

/** Their turn comes round: a fresh action, bonus action, reaction and movement, and the legendary pool refills. */
export const resetForTurn = (res: CombatResources | undefined): CombatResources | undefined =>
  res ? { ...res, econ: {}, legendaryUsed: 0 } : res;

/** Which part of the action economy using an ability spends. */
export const econFor = (group: ActionGroup): Econ | null =>
  group === 'action' ? 'action' : group === 'bonus' ? 'bonus' : group === 'reaction' ? 'reaction' : null;
