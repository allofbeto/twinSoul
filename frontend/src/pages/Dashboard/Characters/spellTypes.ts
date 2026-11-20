import { getSpells } from '../../../api/backendHelpers';
import { createReferenceCache } from './referenceCache';
import { CastTime } from './actionTypes';

/** A spell from the reference list (SRD 5.1). */
export interface Spell {
  index: string;
  name: string;
  level: number; // 0 = cantrip
  school: string | null;
  casting_time: string | null;
  range: string | null;
  components: string[];
  material: string | null;
  duration: string | null;
  concentration: boolean;
  ritual: boolean;
  attack_type: string | null;
  desc: string[];
  higher_level: string[];
  class_indexes: string[];
  subclass_indexes: string[];
  source: string | null;
}

/** The item, NPC or other campaign object a spell comes from ("Other" spells). */
export interface SpellOrigin {
  id: string;
  name: string;
  kind?: string;
}

/** A spell a character has chosen (or written themselves). */
export interface CharacterSpell {
  index: string;
  name: string;
  level: number;
  /** Which spell source it was chosen through, e.g. "class:wizard", "race", "feat:magic-initiate", "other". */
  source: string;
  /** Spellbook casters: whether it's prepared today. */
  prepared?: boolean;
  /** Written by the player (not in the reference list). */
  custom?: boolean;
  school?: string;
  casting_time?: string;
  range?: string;
  duration?: string;
  notes?: string;
  /** "Other" spells: the item or object it comes from. */
  source_ref?: SpellOrigin;
}

const spellCache = createReferenceCache<Spell>(getSpells);

export const useSpells = (game: string = 'dnd_5e') => {
  const { items, loading } = spellCache.useList(game);
  return { spells: items, loading };
};

export const SPELL_LEVEL_LABEL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

/** Which part of the turn a casting time takes ("1 bonus action" → bonus). */
export const castTiming = (castingTime: string | null | undefined): CastTime => {
  const t = (castingTime || '').toLowerCase();
  if (t.includes('bonus')) return 'bonus';
  if (t.includes('reaction')) return 'reaction';
  if (/^1 action/.test(t)) return 'action';
  return 'other';
};

export const slugify = (name: string) =>
  name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
