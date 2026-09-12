import React, { useMemo, useState } from 'react';
import { CR_OPTIONS, xpForChallengeRating } from '../constants';
import { useBestiaryFilters, SORT_OPTIONS } from '../../Monsters/useBestiaryFilters';
import BestiaryFilterBar from '../../Monsters/Components/BestiaryFilterBar';
import MonsterDetailSlideOver from '../../Monsters/Components/MonsterDetailSlideOver';
import type { BestiaryOption, CombatantRow, CombatantSource, HomebrewOption } from './types';

interface Props {
  bestiary: BestiaryOption[];
  homebrew: HomebrewOption[];
  combatants: CombatantRow[];
  onAdd: (row: CombatantRow) => void;
  onRemove: (key: string) => void;
}

let uid = 0;
const nextKey = () => `new-${Date.now()}-${uid++}`;

const RESULTS_LIMIT = 30;

const CombatantPicker = ({ bestiary, homebrew, combatants, onAdd, onRemove }: Props) => {
  const [tab, setTab] = useState<CombatantSource>('bestiary');
  const [homebrewSearch, setHomebrewSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCr, setCustomCr] = useState(CR_OPTIONS[0]);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [detailMonsterId, setDetailMonsterId] = useState<string | null>(null);

  const { filters, setFilters, sort, setSort, filtered, creatureTypes, sizes, habitats, clear } =
    useBestiaryFilters(bestiary);
  const visible = filtered.slice(0, RESULTS_LIMIT);

  const detailMonster = detailMonsterId ? bestiary.find((m) => m.id === detailMonsterId) : undefined;
  const detailCombatant = detailMonsterId
    ? combatants.find((c) => c.monster_id === detailMonsterId && !c._destroy)
    : undefined;

  const quantityFor = (id: string) => quantities[id] ?? 1;
  const setQuantityFor = (id: string, qty: number) => setQuantities((prev) => ({ ...prev, [id]: qty }));

  const filteredHomebrew = useMemo(
    () => homebrew.filter((m) => m.name.toLowerCase().includes(homebrewSearch.toLowerCase())).slice(0, 50),
    [homebrew, homebrewSearch]
  );

  const handleAddBestiary = (m: BestiaryOption) => {
    onAdd({
      key: nextKey(),
      monster_id: m.id,
      name: m.name,
      challenge_rating: m.challenge_rating,
      xp: m.xp,
      quantity: quantityFor(m.id),
      source: 'bestiary',
    });
    setQuantityFor(m.id, 1);
  };

  const handleAddHomebrew = () => {
    const m = homebrew.find((h) => h.id === selectedId);
    if (!m) return;
    onAdd({
      key: nextKey(),
      item_id: m.id,
      name: m.name,
      challenge_rating: m.challenge_rating || undefined,
      xp: xpForChallengeRating(m.challenge_rating),
      quantity: quantityFor(m.id),
      source: 'homebrew',
    });
    setSelectedId('');
  };

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onAdd({
      key: nextKey(),
      name: trimmed,
      challenge_rating: customCr,
      xp: xpForChallengeRating(customCr),
      quantity: customQuantity,
      source: 'custom',
    });
    setCustomName('');
    setCustomQuantity(1);
  };

  return (
    <div className="card-theme p-3">
      <div className="d-flex gap-2 mb-3">
        {(['bestiary', 'homebrew', 'custom'] as CombatantSource[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn btn-sm ${tab === t ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab(t)}
          >
            {t === 'bestiary' ? 'Bestiary' : t === 'homebrew' ? 'Homebrew' : 'Custom'}
          </button>
        ))}
      </div>

      {tab === 'bestiary' && (
        <div>
          <BestiaryFilterBar
            filters={filters}
            onChange={setFilters}
            creatureTypes={creatureTypes}
            sizes={sizes}
            habitats={habitats}
            onClear={clear}
            compact
          />
          <div className="d-flex align-items-center gap-2 mt-2">
            <label className="form-label text-muted-theme mb-0">Sort by</label>
            <select
              className="form-select input-theme"
              style={{ width: 'auto' }}
              value={sort.key}
              onChange={(e) => setSort({ ...sort, key: e.target.value as typeof sort.key })}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
              title={sort.dir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sort.dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }} className="mt-2">
            {visible.length === 0 ? (
              <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>No monsters match these filters.</p>
            ) : (
              visible.map((m) => (
                <div
                  key={m.id}
                  className="d-flex align-items-center gap-2 py-1 skill-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetailMonsterId(m.id)}
                >
                  <div className="flex-grow-1">
                    <span className="text-theme" style={{ color: 'var(--color-primary)' }}>{m.name}</span>{' '}
                    <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>
                      CR {m.challenge_rating} · {m.creature_type}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    className="form-control input-theme"
                    style={{ width: '64px' }}
                    value={quantityFor(m.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setQuantityFor(m.id, Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-theme-primary"
                    onClick={(e) => { e.stopPropagation(); handleAddBestiary(m); }}
                  >
                    + Add
                  </button>
                </div>
              ))
            )}
            {filtered.length > RESULTS_LIMIT && (
              <p className="text-muted-theme mb-0 mt-1" style={{ fontSize: '0.75rem' }}>
                {filtered.length - RESULTS_LIMIT} more match — refine your search to see them.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'homebrew' && (
        <div className="row g-2 align-items-end">
          <div className="col-md-6">
            <label className="form-label text-muted-theme">Search</label>
            <input
              type="text"
              className="form-control input-theme"
              placeholder="Search your homebrew..."
              value={homebrewSearch}
              onChange={(e) => setHomebrewSearch(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted-theme">Creature</label>
            <select
              className="form-select input-theme"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select...</option>
              {filteredHomebrew.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.challenge_rating ? ` (CR ${m.challenge_rating})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-1">
            <label className="form-label text-muted-theme">Qty</label>
            <input
              type="number"
              min={1}
              className="form-control input-theme"
              value={selectedId ? quantityFor(selectedId) : 1}
              onChange={(e) => selectedId && setQuantityFor(selectedId, Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="col-md-1">
            <button
              type="button"
              className="btn btn-theme-primary w-100"
              disabled={!selectedId}
              onClick={handleAddHomebrew}
            >
              + Add
            </button>
          </div>
        </div>
      )}

      {tab === 'custom' && (
        <div className="row g-2 align-items-end">
          <div className="col-md-6">
            <label className="form-label text-muted-theme">Name</label>
            <input
              type="text"
              className="form-control input-theme"
              placeholder="e.g. Cultist"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label text-muted-theme">Challenge Rating</label>
            <select
              className="form-select input-theme"
              value={customCr}
              onChange={(e) => setCustomCr(e.target.value)}
            >
              {CR_OPTIONS.map((cr) => (
                <option key={cr} value={cr}>{cr}</option>
              ))}
            </select>
          </div>
          <div className="col-md-1">
            <label className="form-label text-muted-theme">Qty</label>
            <input
              type="number"
              min={1}
              className="form-control input-theme"
              value={customQuantity}
              onChange={(e) => setCustomQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="col-md-2">
            <button
              type="button"
              className="btn btn-theme-primary w-100"
              disabled={!customName.trim()}
              onClick={handleAddCustom}
            >
              + Add
            </button>
          </div>
        </div>
      )}

      <MonsterDetailSlideOver
        monsterId={detailMonsterId}
        onClose={() => setDetailMonsterId(null)}
        isAdded={!!detailCombatant}
        onAdd={detailMonster ? () => handleAddBestiary(detailMonster) : undefined}
        onRemove={detailCombatant ? () => onRemove(detailCombatant.key) : undefined}
      />
    </div>
  );
};

export default CombatantPicker;
