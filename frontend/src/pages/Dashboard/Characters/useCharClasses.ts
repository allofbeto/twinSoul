import { getCharClasses } from '../../../api/backendHelpers';
import { CharClass } from './classTypes';
import { createReferenceCache } from './referenceCache';

const classCache = createReferenceCache<CharClass>(getCharClasses);

export const useCharClasses = (game: string = 'dnd_5e') => {
  const { items, loading } = classCache.useList(game);
  return { classes: items, loading };
};

export const upsertCharClass = classCache.upsert;
export const removeCharClass = classCache.remove;

export const findCharClass = (classes: CharClass[], index: string | null | undefined) =>
  classes.find((c) => c.index === index);
