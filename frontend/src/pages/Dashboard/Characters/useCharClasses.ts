import { useEffect, useState } from 'react';
import { getCharClasses } from '../../../api/backendHelpers';
import { CharClass } from './classTypes';

const cache: Record<string, CharClass[]> = {};
const inFlight: Record<string, Promise<CharClass[]>> = {};

const fetchCharClasses = (game: string): Promise<CharClass[]> => {
  if (cache[game]) return Promise.resolve(cache[game]);
  if (!inFlight[game]) {
    inFlight[game] = getCharClasses(game).then((res) => {
      cache[game] = res.data;
      return cache[game];
    });
  }
  return inFlight[game];
};

export const useCharClasses = (game: string = 'dnd_5e') => {
  const [classes, setClasses] = useState<CharClass[]>(cache[game] || []);
  const [loading, setLoading] = useState(!cache[game]);

  useEffect(() => {
    let mounted = true;
    setLoading(!cache[game]);
    fetchCharClasses(game).then((data) => {
      if (mounted) {
        setClasses(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [game]);

  return { classes, loading };
};

export const findCharClass = (classes: CharClass[], index: string | null | undefined) =>
  classes.find((c) => c.index === index);
