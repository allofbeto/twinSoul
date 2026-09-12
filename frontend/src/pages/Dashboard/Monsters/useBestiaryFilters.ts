import { useMemo, useState } from 'react';

export interface FilterableMonster {
  name: string;
  creature_type?: string;
  size?: string;
  cr_numeric?: number;
  habitats?: string[];
}

export interface BestiaryFilterState {
  search: string;
  creatureType: string;
  size: string;
  habitat: string;
  minCr: string;
  maxCr: string;
}

export type BestiarySortKey = 'name' | 'cr_numeric' | 'creature_type';
export type SortDirection = 'asc' | 'desc';

export interface BestiarySortState {
  key: BestiarySortKey;
  dir: SortDirection;
}

export const SORT_OPTIONS: { key: BestiarySortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'cr_numeric', label: 'Challenge Rating' },
  { key: 'creature_type', label: 'Type' },
];

export const DEFAULT_BESTIARY_FILTERS: BestiaryFilterState = {
  search: '',
  creatureType: '',
  size: '',
  habitat: '',
  minCr: '',
  maxCr: '',
};

const DEFAULT_SORT: BestiarySortState = { key: 'name', dir: 'asc' };

export function useBestiaryFilters<T extends FilterableMonster>(monsters: T[]) {
  const [filters, setFilters] = useState<BestiaryFilterState>(DEFAULT_BESTIARY_FILTERS);
  const [sort, setSort] = useState<BestiarySortState>(DEFAULT_SORT);

  const creatureTypes = useMemo(
    () => Array.from(new Set(monsters.map((m) => m.creature_type))).filter(Boolean).sort() as string[],
    [monsters]
  );
  const sizes = useMemo(
    () => Array.from(new Set(monsters.map((m) => m.size))).filter(Boolean).sort() as string[],
    [monsters]
  );
  const habitats = useMemo(
    () => Array.from(new Set(monsters.flatMap((m) => m.habitats || []))).sort(),
    [monsters]
  );

  const filtered = useMemo(() => {
    const minCr = filters.minCr === '' ? null : parseFloat(filters.minCr);
    const maxCr = filters.maxCr === '' ? null : parseFloat(filters.maxCr);

    const matches = monsters.filter((m) => {
      if (filters.search && !m.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.creatureType && m.creature_type !== filters.creatureType) return false;
      if (filters.size && m.size !== filters.size) return false;
      if (filters.habitat && !(m.habitats || []).includes(filters.habitat)) return false;
      if (minCr !== null && (m.cr_numeric ?? 0) < minCr) return false;
      if (maxCr !== null && (m.cr_numeric ?? 0) > maxCr) return false;
      return true;
    });

    const sorted = [...matches].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      const result =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal ?? '').localeCompare(String(bVal ?? ''));
      return sort.dir === 'asc' ? result : -result;
    });

    return sorted;
  }, [monsters, filters, sort]);

  const clear = () => setFilters(DEFAULT_BESTIARY_FILTERS);

  return { filters, setFilters, sort, setSort, filtered, creatureTypes, sizes, habitats, clear };
}
