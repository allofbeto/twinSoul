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
export interface CharacterFeat {
  index: string;
  name: string;
  ability?: string; // ability code raised by the feat, if any
  taken_at?: string; // e.g. "Fighter 4"
}

const featCache = createReferenceCache<Feat>(getFeats);

export const useFeats = (game: string = 'dnd_5e') => {
  const { items, loading } = featCache.useList(game);
  return { feats: items, loading };
};

// Tough: +2 hit points per character level.
export const toughHpBonus = (feats: { index: string }[], level: number) =>
  feats.some((f) => f.index === 'tough') ? 2 * level : 0;
