import { getFeats } from '../../../api/backendHelpers';
import { createReferenceCache } from './referenceCache';

export interface Feat {
  id: string;
  index: string;
  name: string;
  source: string | null;
  prerequisite: string | null;
  desc: string[];
  ability_options: string[]; // ability codes the feat can raise (pick one)
  ability_bonus: number;
}

// A feat a character has taken.
export type FeatSource = 'class' | 'race' | 'level' | 'other';

export interface CharacterFeat {
  index: string; // catalog index, or "custom-..." for the table's own feats
  name: string;
  ability?: string; // ability code raised by the feat, if any
  taken_at?: string; // e.g. "Fighter 4"
  /** Where it came from. Older feats have none: an ASI ("taken_at") counts as level. */
  source?: FeatSource;
  /** The table's own feats carry their text here. */
  desc?: string;
}

export const FEAT_SOURCES: { key: FeatSource; label: string; hint: string }[] = [
  { key: 'class', label: 'Class', hint: 'Granted by a class or subclass feature' },
  { key: 'race', label: 'Race', hint: 'From your race, e.g. Variant Human' },
  { key: 'level', label: 'Level', hint: 'Taken instead of an Ability Score Improvement' },
  { key: 'other', label: 'Other', hint: 'Backgrounds, boons, DM rewards, house rules' },
];

export const featSource = (f: CharacterFeat): FeatSource => f.source || (f.taken_at ? 'level' : 'other');

const featCache = createReferenceCache<Feat>(getFeats);

export const useFeats = (game: string = 'dnd_5e') => {
  const { items, loading } = featCache.useList(game);
  return { feats: items, loading };
};

// Tough: +2 hit points per character level.
export const toughHpBonus = (feats: { index: string }[], level: number) =>
  feats.some((f) => f.index === 'tough') ? 2 * level : 0;
