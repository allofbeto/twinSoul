// What a character can do on their turn: their own attacks, spells, bonus
// actions and reactions, plus the basic actions every 5e character has.

export type ActionKind = 'action' | 'bonus' | 'reaction' | 'spell' | 'other';
export type CastTime = 'action' | 'bonus' | 'reaction' | 'other';

export interface SheetAction {
  id: string;
  name: string;
  kind: ActionKind;
  /** Spells: how long it takes to cast, so it also shows under Bonus / Reactions. */
  cast_time?: CastTime;
  /** Spells: 0 = cantrip. Casting spends a slot of this level. */
  spell_level?: number;
  attack?: string; // "+5" or "DC 14 DEX"
  damage?: string; // "1d8+3 slashing"
  range?: string; // "5 ft", "60 ft", "Self"
  notes?: string;
  /** Never saved: where a read-only row comes from, e.g. "Maneuver". */
  tag?: string;
  /** Never saved: spells only, the school of magic (for the watermark). */
  school?: string;
  /** Never saved: what using it costs, e.g. "1 superiority die". */
  cost?: string;
  /** Never saved: longer description for display (from spell, feat, item, choice). */
  description?: string;
  /** Never saved: what this action came from (spell, choice, feat, item, action). */
  source?: 'spell' | 'choice' | 'feat' | 'item' | 'action';
}

export const ACTION_KINDS: { key: ActionKind; label: string; short: string }[] = [
  { key: 'action', label: 'Action', short: 'A' },
  { key: 'bonus', label: 'Bonus Action', short: 'BA' },
  { key: 'reaction', label: 'Reaction', short: 'R' },
  { key: 'spell', label: 'Spell', short: 'S' },
  { key: 'other', label: 'Other', short: '•' },
];

export const CAST_TIMES: { key: CastTime; label: string }[] = [
  { key: 'action', label: '1 action' },
  { key: 'bonus', label: '1 bonus action' },
  { key: 'reaction', label: '1 reaction' },
  { key: 'other', label: 'Longer / other' },
];

/** When on the turn it happens (spells sort by their casting time). */
export const timing = (a: SheetAction): CastTime =>
  a.kind === 'spell' ? (a.cast_time || 'action') : a.kind === 'other' ? 'other' : a.kind;

export const newActionId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// The basic actions in the rules, in our own short words.
export const BASIC_ACTIONS: { name: string; kind: ActionKind; summary: string }[] = [
  { name: 'Attack', kind: 'action', summary: 'Make one weapon or unarmed attack (more with Extra Attack).' },
  { name: 'Cast a Spell', kind: 'action', summary: 'Cast a spell whose casting time is one action.' },
  { name: 'Dash', kind: 'action', summary: 'Gain extra movement equal to your speed this turn.' },
  { name: 'Disengage', kind: 'action', summary: 'Your movement doesn’t provoke opportunity attacks this turn.' },
  { name: 'Dodge', kind: 'action', summary: 'Attacks against you have disadvantage; DEX saves have advantage.' },
  { name: 'Help', kind: 'action', summary: 'Give an ally advantage on their next check or attack against a target near you.' },
  { name: 'Hide', kind: 'action', summary: 'Make a Stealth check to hide.' },
  { name: 'Ready', kind: 'action', summary: 'Choose a trigger and an action to take with your reaction when it happens.' },
  { name: 'Search', kind: 'action', summary: 'Look for something with a Perception or Investigation check.' },
  { name: 'Use an Object', kind: 'action', summary: 'Use an item that needs your action, like a potion or lever.' },
  { name: 'Grapple / Shove', kind: 'action', summary: 'Replace one attack with an Athletics contest to grab or push.' },
  { name: 'Off-hand Attack', kind: 'bonus', summary: 'After attacking with a light weapon, attack with another light weapon in your other hand.' },
  { name: 'Opportunity Attack', kind: 'reaction', summary: 'Attack a creature that leaves your reach.' },
];
