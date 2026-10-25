// NPC stat-block data beyond the basics: action economy, spells, gear, saves.
// Mirrors the jsonb columns added to items.

import { DND_SKILLS } from '../Characters/constants';

/** One damage component of an action. An action may have several (slashing + fire). */
export interface Damage {
  mode: 'dice' | 'flat' | 'text';
  dice_count?: number | string;
  dice_sides?: number | string;
  bonus?: number | string;
  /** Ability whose modifier is added (dice only). */
  ability?: string;
  flat?: number | string;
  /** Older free-text damage ("2d6+3"). */
  text?: string;
  type?: string;
}

export interface Feature {
  name: string;
  desc?: string;
  /** Flat attack bonus, e.g. 5 → "+5 to hit". With an attack_ability it is an extra
   * (magic weapon, etc.) added on top of the computed value. Empty for non-attacks. */
  attack_bonus?: number | string | null;
  /** Ability key ("strength") whose modifier drives the attack roll. */
  attack_ability?: string;
  /** Add the NPC's proficiency bonus (only with attack_ability). Defaults to true. */
  attack_proficient?: boolean;
  /** Which die the attack rolls: 20 (default) or 100. */
  attack_die?: number | string;
  /** Damage components. When present it replaces the older single-damage fields below. */
  damages?: Damage[];
  /** Legacy free-text damage ("2d6+3"); used only when damage_mode is unset. */
  damage?: string;
  /** What the action rolls: an attack, an ability/skill check, or any custom dice. Unset on
   * older rows (inferred from the attack fields). */
  roll_kind?: 'attack' | 'check' | 'custom' | '';
  /** check: 'skill:Persuasion' or 'ability:charisma'. */
  check_with?: string;
  /** check: extra bonus on top of the ability/skill. */
  roll_bonus?: number | string;
  /** custom: any dice expression ("1d100", "2d6+1") and a label for it. */
  roll_expr?: string;
  roll_label?: string;
  /** Explicit "this is an attack roll" flag (older rows imply it from the to-hit fields). */
  attack_roll?: boolean;
  /** 'dice' → count d sides (+ability mod, +bonus); 'flat' → a fixed amount. */
  damage_mode?: 'dice' | 'flat' | '';
  damage_dice_count?: number | string;
  damage_dice_sides?: number | string;
  damage_bonus?: number | string;
  /** Ability whose modifier is added to dice damage. */
  damage_ability?: string;
  damage_flat?: number | string;
  /** Save the target makes, and the DC (manual, or derived from one of the NPC's abilities). */
  save_ability?: string;
  save_dc?: number | string;
  save_dc_ability?: string;
  damage_type?: string;
  /** "Reach 5 ft." / "80/320 ft." */
  range?: string;
  /** "DEX 14" — save the target makes. */
  save?: string;
  /** "3/day", "Recharge 5–6", "At will". */
  uses?: string;
}

export interface Spell {
  name: string;
  /** 0 = cantrip */
  level: number;
  uses?: string;
  concentration?: boolean;
  desc?: string;
}

export interface GearItem { name: string; qty?: number | string; desc?: string }

export interface Spellcasting {
  ability?: string;
  /** Slots per spell level: { "1": 4, "2": 3 } */
  slots?: Record<string, number | string>;
}

export interface StatblockFields {
  traits: Feature[];
  actions: Feature[];
  bonus_actions: Feature[];
  reactions: Feature[];
  legendary_actions: Feature[];
  spells: Spell[];
  spellcasting: Spellcasting;
  equipment: GearItem[];
  saving_throws: string[];
  speed: string;
  senses: string;
  languages: string;
  defenses: string;
}

export const emptyStatblock = (): StatblockFields => ({
  traits: [], actions: [], bonus_actions: [], reactions: [], legendary_actions: [],
  spells: [], spellcasting: {}, equipment: [], saving_throws: [],
  speed: '', senses: '', languages: '', defenses: '',
});

/** Pull the statblock fields off an API item, tolerating nulls on old rows. */
export const statblockFrom = (d: any): StatblockFields => ({
  traits: d.traits ?? [],
  actions: d.actions ?? [],
  bonus_actions: d.bonus_actions ?? [],
  reactions: d.reactions ?? [],
  legendary_actions: d.legendary_actions ?? [],
  spells: d.spells ?? [],
  spellcasting: d.spellcasting ?? {},
  equipment: d.equipment ?? [],
  saving_throws: d.saving_throws ?? [],
  speed: d.speed ?? '',
  senses: d.senses ?? '',
  languages: d.languages ?? '',
  defenses: d.defenses ?? '',
});

export const modOfScore = (score?: number | null) => Math.floor(((score ?? 10) - 10) / 2);

export const proficiencyForCr = (cr?: string | null) => {
  let n = 0;
  if (cr) n = cr.includes('/') ? Number(cr.split('/')[0]) / (Number(cr.split('/')[1]) || 1) : Number(cr) || 0;
  return 2 + Math.floor((Math.max(n, 1) - 1) / 4);
};

const ABILITY_LABEL: Record<string, string> = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
};

export const isAttack = (f: Feature) =>
  f.attack_roll === false
    ? false
    : f.attack_roll === true || !!f.attack_ability || !(f.attack_bonus === '' || f.attack_bonus == null);

/** Effective to-hit for a feature, or null if it isn't an attack. */
export const rollKindOf = (f: Feature): 'attack' | 'check' | 'custom' | '' =>
  f.roll_kind !== undefined ? f.roll_kind : isAttack(f) ? 'attack' : '';

/** A skill / ability check this action rolls, with its total bonus. */
export const checkOf = (f: Feature, mods: Record<string, number>, pb: number, ownedSkills: string[]): { label: string; bonus: number } | null => {
  if (rollKindOf(f) !== 'check' || !f.check_with) return null;
  const [kind, name] = f.check_with.split(':');
  const extra = Number(f.roll_bonus) || 0;
  if (kind === 'skill') {
    const sk = DND_SKILLS.find((x) => x.name === name);
    if (!sk) return null;
    const proficient = ownedSkills.map((x) => x.toLowerCase()).includes(name.toLowerCase());
    return { label: name, bonus: (mods[sk.ability] ?? 0) + (proficient ? pb : 0) + extra };
  }
  return { label: `${ABILITY_LABEL[name] ?? name} check`, bonus: (mods[name] ?? 0) + extra };
};

/** A free-form dice roll this action makes. */
export const customRollOf = (f: Feature): { expr: string; label: string } | null =>
  rollKindOf(f) === 'custom' && f.roll_expr?.trim() ? { expr: f.roll_expr.trim(), label: f.roll_label?.trim() || f.roll_expr.trim() } : null;

export const attackBonusOf = (f: Feature, mods: Record<string, number>, pb: number): number | null => {
  if (rollKindOf(f) !== 'attack') return null;
  const extra = f.attack_bonus === '' || f.attack_bonus == null ? 0 : Number(f.attack_bonus);
  if (f.attack_ability) return (mods[f.attack_ability] ?? 0) + (f.attack_proficient === false ? 0 : pb) + extra;
  return extra;
};

const damageComponentExpr = (c: Damage, mods: Record<string, number>): string | null => {
  if (c.mode === 'dice') {
    const count = Math.max(1, Number(c.dice_count) || 1);
    const sides = Number(c.dice_sides) || 6;
    const mod = (c.ability ? mods[c.ability] ?? 0 : 0) + (Number(c.bonus) || 0);
    return `${count}d${sides}${mod ? (mod > 0 ? '+' : '-') + Math.abs(mod) : ''}`;
  }
  if (c.mode === 'flat') return String(Math.max(0, Number(c.flat) || 0));
  return c.text?.trim() || null;
};

/** The action's damage components, reading older single-damage rows too. */
export const damagesOf = (f: Feature): Damage[] => {
  if (Array.isArray(f.damages)) return f.damages;
  if (f.damage_mode === 'dice') {
    return [{ mode: 'dice', dice_count: f.damage_dice_count, dice_sides: f.damage_dice_sides, bonus: f.damage_bonus, ability: f.damage_ability, type: f.damage_type }];
  }
  if (f.damage_mode === 'flat') return [{ mode: 'flat', flat: f.damage_flat, type: f.damage_type }];
  if (f.damage?.trim()) return [{ mode: 'text', text: f.damage.trim(), type: f.damage_type }];
  return [];
};

/** What to roll for each damage component: [{ expr: "1d8+3", type: "slashing" }, …]. */
export const damageRollsOf = (f: Feature, mods: Record<string, number>): { expr: string; type?: string }[] =>
  damagesOf(f).flatMap((c) => { const expr = damageComponentExpr(c, mods); return expr ? [{ expr, type: c.type || undefined }] : []; });

/** "1d8+3 slashing + 2d6 fire" */
export const damageTextOf = (f: Feature, mods: Record<string, number>): string =>
  damageRollsOf(f, mods).map((r) => `${r.expr}${r.type ? ` ${r.type}` : ''}`).join(' + ');

/** Save DC: manual, or 8 + proficiency + the chosen ability modifier. */
export const saveDcOf = (f: Feature, mods: Record<string, number>, pb: number): number | null => {
  if (f.save_dc_ability) return 8 + pb + (mods[f.save_dc_ability] ?? 0);
  return f.save_dc === '' || f.save_dc == null ? null : Number(f.save_dc);
};

export const saveTextOf = (f: Feature, mods: Record<string, number>, pb: number): string | null => {
  if (f.save_ability) {
    const dc = saveDcOf(f, mods, pb);
    return `${ABILITY_LABEL[f.save_ability] ?? f.save_ability}${dc === null ? '' : ` DC ${dc}`}`;
  }
  return f.save?.trim() || null;
};

export const attackDieOf = (f: Feature) => (Number(f.attack_die) === 100 ? 100 : 20);

/** Drop blank rows and coerce numeric strings before sending to the API. */
export const cleanStatblock = (s: StatblockFields): StatblockFields => {
  const feats = (l: Feature[]) =>
    l.filter((f) => f.name?.trim()).map((f) => ({
      ...f,
      attack_bonus: f.attack_bonus === '' || f.attack_bonus == null ? null : Number(f.attack_bonus),
      attack_die: Number(f.attack_die) === 100 ? 100 : 20,
      attack_ability: f.attack_ability || undefined,
      // Legacy free-text damage is superseded once a structured mode is chosen.
      damage: f.damage_mode || Array.isArray(f.damages) ? undefined : f.damage,
      damages: Array.isArray(f.damages) ? f.damages.filter((c) => c.mode) : undefined,
      damage_ability: f.damage_ability || undefined,
      save_ability: f.save_ability || undefined,
      save_dc_ability: f.save_dc_ability || undefined,
    }));
  const slots = Object.fromEntries(
    Object.entries(s.spellcasting?.slots ?? {}).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])
  );
  return {
    ...s,
    traits: feats(s.traits), actions: feats(s.actions), bonus_actions: feats(s.bonus_actions),
    reactions: feats(s.reactions), legendary_actions: feats(s.legendary_actions),
    spells: s.spells.filter((x) => x.name?.trim()).map((x) => ({ ...x, level: Number(x.level) || 0 })),
    equipment: s.equipment.filter((x) => x.name?.trim()),
    spellcasting: { ability: s.spellcasting?.ability || undefined, slots },
  };
};

export const SPELL_LEVEL_LABEL = (n: number) =>
  n === 0 ? 'Cantrips' : `${n}${['st', 'nd', 'rd'][n - 1] ?? 'th'} level`;
