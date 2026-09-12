import React from 'react';
import type { BestiaryFilterState } from '../useBestiaryFilters';
import { CR_STEPS, HABITAT_LABEL } from '../constants';

interface Props {
  filters: BestiaryFilterState;
  onChange: (filters: BestiaryFilterState) => void;
  creatureTypes: string[];
  sizes: string[];
  habitats: string[];
  onClear: () => void;
  compact?: boolean;
}

const BestiaryFilterBar = ({ filters, onChange, creatureTypes, sizes, habitats, onClear, compact }: Props) => {
  const set = (patch: Partial<BestiaryFilterState>) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.search || filters.creatureType || filters.size || filters.habitat || filters.minCr || filters.maxCr;

  return (
    <div className={`row g-2 ${compact ? '' : 'mb-3'} align-items-end`}>
      <div className="col-md-4">
        <label className="form-label text-muted-theme">Search</label>
        <input
          type="text"
          className="form-control input-theme"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>
      <div className="col-md-2">
        <label className="form-label text-muted-theme">Type</label>
        <select
          className="form-select input-theme"
          value={filters.creatureType}
          onChange={(e) => set({ creatureType: e.target.value })}
        >
          <option value="">All Types</option>
          {creatureTypes.map((t) => (
            <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>
          ))}
        </select>
      </div>
      <div className="col-md-2">
        <label className="form-label text-muted-theme">Size</label>
        <select
          className="form-select input-theme"
          value={filters.size}
          onChange={(e) => set({ size: e.target.value })}
        >
          <option value="">All Sizes</option>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="col-md-2">
        <label className="form-label text-muted-theme">Habitat</label>
        <select
          className="form-select input-theme"
          value={filters.habitat}
          onChange={(e) => set({ habitat: e.target.value })}
        >
          <option value="">All Habitats</option>
          {habitats.map((h) => (
            <option key={h} value={h}>{HABITAT_LABEL[h] || h}</option>
          ))}
        </select>
      </div>
      <div className="col-md-1">
        <label className="form-label text-muted-theme">Min CR</label>
        <select
          className="form-select input-theme"
          value={filters.minCr}
          onChange={(e) => set({ minCr: e.target.value })}
        >
          <option value="">—</option>
          {CR_STEPS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="col-md-1">
        <label className="form-label text-muted-theme">Max CR</label>
        <select
          className="form-select input-theme"
          value={filters.maxCr}
          onChange={(e) => set({ maxCr: e.target.value })}
        >
          <option value="">—</option>
          {CR_STEPS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      {hasActiveFilters && (
        <div className="col-12">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClear}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default BestiaryFilterBar;
