import { useEffect, useState } from 'react';

interface Indexed {
  index: string;
  user_id?: string | null;
}

// A tiny per-game cache for reference data (races, classes) shared by every
// component that lists it. Homebrew edits go through upsert/remove so all
// mounted pickers see the change without refetching.
export const createReferenceCache = <T extends Indexed>(fetcher: (game: string) => Promise<{ data: T[] }>) => {
  const cache: Record<string, T[]> = {};
  const inFlight: Record<string, Promise<T[]>> = {};
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const load = (game: string): Promise<T[]> => {
    if (cache[game]) return Promise.resolve(cache[game]);
    if (!inFlight[game]) {
      inFlight[game] = fetcher(game)
        .then((res) => {
          cache[game] = res.data;
          return cache[game];
        })
        .finally(() => {
          delete inFlight[game];
        });
    }
    return inFlight[game];
  };

  const useList = (game: string = 'dnd_5e') => {
    const [items, setItems] = useState<T[]>(cache[game] || []);
    const [loading, setLoading] = useState(!cache[game]);

    useEffect(() => {
      let mounted = true;
      const sync = () => mounted && cache[game] && setItems(cache[game]);
      listeners.add(sync);
      setLoading(!cache[game]);
      load(game)
        .then((data) => {
          if (mounted) setItems(data);
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
        listeners.delete(sync);
      };
    }, [game]);

    return { items, loading };
  };

  const upsert = (game: string, item: T, replaceIndex?: string) => {
    const list = cache[game] || [];
    const key = replaceIndex || item.index;
    cache[game] = list.some((x) => x.index === key)
      ? list.map((x) => (x.index === key ? item : x))
      : [...list, item];
    notify();
  };

  const remove = (game: string, index: string) => {
    cache[game] = (cache[game] || []).filter((x) => x.index !== index);
    notify();
  };

  return { useList, upsert, remove };
};

// Players may only put SRD content or their own homebrew on a character;
// other people's homebrew (visible through a shared campaign) is read-only.
export const isSelectableBy = (item: Indexed, userId: string | null | undefined) =>
  !item.user_id || item.user_id === userId;
