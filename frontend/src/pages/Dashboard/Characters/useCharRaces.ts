import { useEffect, useState } from 'react';
import { getCharRaces } from '../../../api/backendHelpers';
import { CharRace } from './raceTypes';

const cache: Record<string, CharRace[]> = {};
const inFlight: Record<string, Promise<CharRace[]>> = {};

const fetchCharRaces = (game: string): Promise<CharRace[]> => {
  if (cache[game]) return Promise.resolve(cache[game]);
  if (!inFlight[game]) {
    inFlight[game] = getCharRaces(game).then((res) => {
      cache[game] = res.data;
      return cache[game];
    });
  }
  return inFlight[game];
};

export const useCharRaces = (game: string = 'dnd_5e') => {
  const [races, setRaces] = useState<CharRace[]>(cache[game] || []);
  const [loading, setLoading] = useState(!cache[game]);

  useEffect(() => {
    let mounted = true;
    setLoading(!cache[game]);
    fetchCharRaces(game).then((data) => {
      if (mounted) {
        setRaces(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [game]);

  return { races, loading };
};

export const findCharRace = (races: CharRace[], index: string | null | undefined) =>
  races.find((r) => r.index === index);
