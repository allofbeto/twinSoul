// Statuses a combatant can carry, resistances and immunities, and the damage
// types they apply to. Effects are in our own short words.

export const CONDITIONS: { name: string; effect: string }[] = [
  { name: 'Blinded', effect: 'Can’t see. Attacks against it have advantage; its own attacks have disadvantage.' },
  { name: 'Charmed', effect: 'Can’t attack or harm whoever charmed it, who has advantage on social checks against it.' },
  { name: 'Deafened', effect: 'Can’t hear, and fails anything that depends on hearing.' },
  { name: 'Frightened', effect: 'Disadvantage on checks and attacks while it can see the source, and it can’t willingly move closer.' },
  { name: 'Grappled', effect: 'Speed is 0 until the grapple ends.' },
  { name: 'Incapacitated', effect: 'Can’t take actions or reactions.' },
  { name: 'Invisible', effect: 'Can’t be seen. Attacks against it have disadvantage; its attacks have advantage.' },
  { name: 'Paralyzed', effect: 'Incapacitated, can’t move or speak. Attacks against it have advantage, and hits from within 5 ft are critical.' },
  { name: 'Petrified', effect: 'Turned to stone: incapacitated, doesn’t age, resistant to all damage, immune to poison and disease.' },
  { name: 'Poisoned', effect: 'Disadvantage on attack rolls and ability checks.' },
  { name: 'Prone', effect: 'On the ground. Its attacks have disadvantage; melee attacks against it have advantage, ranged ones disadvantage.' },
  { name: 'Restrained', effect: 'Speed 0. Attacks against it have advantage; its attacks and DEX saves have disadvantage.' },
  { name: 'Stunned', effect: 'Incapacitated, can’t move, auto-fails STR and DEX saves. Attacks against it have advantage.' },
  { name: 'Unconscious', effect: 'Incapacitated, prone and unaware. Auto-fails STR and DEX saves; hits from within 5 ft are critical.' },
  { name: 'Concentrating', effect: 'Holding a spell. Damage forces a CON save (DC 10 or half the damage) or the spell ends.' },
];

export const EXHAUSTION_EFFECT = [
  '', 'Disadvantage on ability checks.', 'Speed halved.', 'Disadvantage on attacks and saves.',
  'Hit point maximum halved.', 'Speed 0.', 'Dead.',
];

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
] as const;

const PHYSICAL = ['bludgeoning', 'piercing', 'slashing'];

export interface DefenseEntry {
  /** Damage types it covers. */
  types: string[];
  /** The qualifier, e.g. "nonmagical weapons". */
  note?: string;
  /** What to show. */
  label: string;
}

export interface DefenseSet {
  resist: DefenseEntry[];
  immune: DefenseEntry[];
  vulnerable: DefenseEntry[];
  conditionImmune: string[];
}

export const emptyDefenses = (): DefenseSet => ({ resist: [], immune: [], vulnerable: [], conditionImmune: [] });
export const hasDefenses = (d?: DefenseSet | null) => !!d && (d.resist.length + d.immune.length + d.vulnerable.length + d.conditionImmune.length) > 0;

const typesIn = (text: string) => DAMAGE_TYPES.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(text));

/** "bludgeoning, piercing, and slashing from nonmagical weapons" → physical, nonmagical weapons. */
export const parseDefenseEntry = (raw: string): DefenseEntry => {
  const text = raw.trim();
  const [head, ...rest] = text.split(/\s+from\s+|\s+that\s+/i);
  const types = typesIn(head);
  const note = rest.length ? text.slice(head.length).replace(/^\s*(from|that)\s+/i, '').trim() : undefined;
  const physical = PHYSICAL.every((t) => types.includes(t as typeof DAMAGE_TYPES[number]));
  const label = types.length === 0
    ? text
    : `${physical && types.length === 3 ? 'physical' : types.join(', ')}${note ? ` (${note})` : ''}`;
  return { types: types.length ? types : [], note, label };
};

/**
 * An NPC's free-text defenses ("Resistant to fire and cold; immune to poison,
 * charmed"). Anything we can't place stays as one note so nothing is lost.
 */
export const parseDefenseText = (text?: string | null): { defenses: DefenseSet; leftover: string } => {
  const defenses = emptyDefenses();
  const leftovers: string[] = [];
  (text || '').split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((segment) => {
    const kind = /vulnerab/i.test(segment) ? 'vulnerable' : /resist/i.test(segment) ? 'resist' : /immun/i.test(segment) ? 'immune' : null;
    if (!kind) { leftovers.push(segment); return; }
    const damage = typesIn(segment);
    const conditions = CONDITIONS.filter((c) => new RegExp(`\\b${c.name}\\b`, 'i').test(segment)).map((c) => c.name);
    if (damage.length) {
      const note = /nonmagical/i.test(segment) ? 'nonmagical' : undefined;
      defenses[kind].push({ types: [...damage], note, label: `${damage.join(', ')}${note ? ` (${note})` : ''}` });
    }
    if (kind === 'immune' && conditions.length) defenses.conditionImmune.push(...conditions);
    if (!damage.length && !conditions.length) leftovers.push(segment);
  });
  return { defenses, leftover: leftovers.join('; ') };
};

export type LensEffect = { kind: 'immune' | 'resist' | 'vulnerable'; note?: string } | null;

/** How a creature fares against one damage type (immunity beats resistance beats vulnerability). */
export const effectAgainst = (d: DefenseSet | undefined | null, type: string | null): LensEffect => {
  if (!d || !type) return null;
  const hit = (list: DefenseEntry[]) => list.find((e) => e.types.includes(type));
  const immune = hit(d.immune);
  if (immune) return { kind: 'immune', note: immune.note };
  const resist = hit(d.resist);
  if (resist) return { kind: 'resist', note: resist.note };
  const vuln = hit(d.vulnerable);
  return vuln ? { kind: 'vulnerable', note: vuln.note } : null;
};
