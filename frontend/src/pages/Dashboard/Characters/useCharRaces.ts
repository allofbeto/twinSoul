import { getCharRaces } from '../../../api/backendHelpers';
import { CharRace } from './raceTypes';
import { createReferenceCache } from './referenceCache';

const raceCache = createReferenceCache<CharRace>(getCharRaces);

export const useCharRaces = (game: string = 'dnd_5e') => {
  const { items, loading } = raceCache.useList(game);
  return { races: items, loading };
};

export const upsertCharRace = raceCache.upsert;
export const removeCharRace = raceCache.remove;

export const findCharRace = (races: CharRace[], index: string | null | undefined) =>
  races.find((r) => r.index === index);
