import React, { useRef, useState } from 'react';
import { useCharRaces, findCharRace } from '../useCharRaces';
import { CharRace, isCoreRace, RaceTrait, Subrace, raceIconKey } from '../raceTypes';
import { isSelectableBy } from '../referenceCache';
import { useAuth } from '../../../../context/AuthContext';
import HomebrewModal from '../homebrew/HomebrewModal';
import RaceIcon from './RaceIcon';
import '../../../../styles/homebrew.css';
import '../../../../styles/characterCreation.css';

interface Props {
  selectedRaceIndex: string | null;
  selectedSubraceIndex: string | null;
  onSelect: (args: { raceIndex: string; raceName: string; subraceIndex?: string; subraceName?: string }) => void;
}

const formatBonus = (ability: string, bonus: number) => `${ability.toUpperCase()} ${bonus > 0 ? '+' : ''}${bonus}`;

type RaceFilter = 'all' | 'core' | 'expanded' | 'homebrew';

const FILTERS: { key: RaceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'core', label: 'Core' },
  { key: 'expanded', label: 'Expanded' },
  { key: 'homebrew', label: 'Homebrew' },
];

const matchesFilter = (race: CharRace, filter: RaceFilter) => {
  if (filter === 'core') return isCoreRace(race);
  if (filter === 'expanded') return !race.homebrew && !isCoreRace(race);
  if (filter === 'homebrew') return !!race.homebrew;
  return true;
};

// Traits that only restate numbers already shown as chips.
const HIDDEN_TRAITS = new Set(['ability-score-increase']);

const TraitCard = ({ trait, from }: { trait: RaceTrait; from?: string }) => (
  <div className="race-trait">
    <div className="race-trait-name">
      {trait.name}
      {from && <span className="race-trait-from">{from}</span>}
    </div>
    {trait.desc.map((d, i) => (
      <p key={i} className="race-trait-desc">{d}</p>
    ))}
  </div>
);

// Race selection for the character builder: one tap picks a race, and the
// spotlight above the grid shows everything about it, including subraces.
const RaceIconPicker = ({ selectedRaceIndex, selectedSubraceIndex, onSelect }: Props) => {
  const { races: allRaces, loading } = useCharRaces('dnd_5e');
  const { user } = useAuth();
  const races = allRaces.filter((r) => isSelectableBy(r, user?.id));
  const [filter, setFilter] = useState<RaceFilter>('all');
  const [query, setQuery] = useState('');
  const [homebrewEditor, setHomebrewEditor] = useState<{ open: boolean; existing: CharRace | null }>({ open: false, existing: null });
  const spotlightRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const selected = findCharRace(races, selectedRaceIndex);
  const subrace = selected?.subraces.find((s) => s.index === selectedSubraceIndex);

  const q = query.trim().toLowerCase();
  const shownRaces = races.filter(
    (r) => matchesFilter(r, filter) && (!q || r.name.toLowerCase().includes(q) || r.subraces.some((s) => s.name.toLowerCase().includes(q))),
  );

  const pickRace = (race: CharRace) => {
    if (race.index !== selectedRaceIndex) onSelect({ raceIndex: race.index, raceName: race.name });
    // Bring the spotlight into view when it is off screen (phones, long grid).
    window.requestAnimationFrame(() => {
      const el = spotlightRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const pickSubrace = (race: CharRace, sr: Subrace) =>
    onSelect({ raceIndex: race.index, raceName: race.name, subraceIndex: sr.index, subraceName: sr.name });

  const bonuses = [...(selected?.ability_bonuses || []), ...(subrace?.ability_bonuses || [])];

  return (
    <div>
      <div ref={spotlightRef} className={`race-spotlight ${selected ? 'has-race' : ''}`} aria-live="polite">
        {!selected ? (
          <div className="race-spotlight-empty">
            <span className="race-spotlight-empty-mark" aria-hidden="true">✦</span>
            <div>
              <div className="race-spotlight-empty-title">Choose your people</div>
              <div className="race-spotlight-empty-text">Tap a race below to see its gifts.</div>
            </div>
          </div>
        ) : (
          <div key={selected.index} className="race-spotlight-body">
            <div className="race-spotlight-head">
              <div className="race-spotlight-icon">
                <RaceIcon index={raceIconKey(selected)} size="4.25rem" />
              </div>
              <div className="race-spotlight-intro">
                <h3 className="race-spotlight-name">
                  {subrace ? subrace.name : selected.name}
                  {selected.homebrew && <span className="homebrew-badge ms-2">Homebrew</span>}
                </h3>
                <button
                  type="button"
                  className="race-change-link"
                  onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Change race ↓
                </button>
                {(selected.description || subrace?.desc) && (
                  <p className="race-spotlight-blurb">{subrace?.desc || selected.description}</p>
                )}
                <div className="race-chips">
                  {bonuses.map((b, i) => (
                    <span key={`${b.ability_score}-${i}`} className={`race-chip race-chip--bonus ${b.bonus < 0 ? 'is-negative' : ''}`}>
                      {formatBonus(b.ability_score, b.bonus)}
                    </span>
                  ))}
                  <span className="race-chip">{selected.speed} ft</span>
                  <span className="race-chip">{selected.size}</span>
                  {selected.languages.length > 0 && <span className="race-chip">{selected.languages.join(', ')}</span>}
                </div>
              </div>
            </div>

            {selected.subraces.length > 0 && (
              <div className="race-subraces">
                <div className="race-section-label">
                  Choose your lineage {!subrace && <span className="race-needs">required</span>}
                </div>
                <div className="race-subrace-grid">
                  {selected.subraces.map((sr) => (
                    <button
                      key={sr.index}
                      type="button"
                      className={`race-subrace ${sr.index === selectedSubraceIndex ? 'is-selected' : ''}`}
                      onClick={() => pickSubrace(selected, sr)}
                      aria-pressed={sr.index === selectedSubraceIndex}
                    >
                      <span className="race-subrace-name">{sr.name}</span>
                      {sr.ability_bonuses.length > 0 && (
                        <span className="race-subrace-bonus">{sr.ability_bonuses.map((b) => formatBonus(b.ability_score, b.bonus)).join(' · ')}</span>
                      )}
                      {sr.racial_traits.length > 0 && (
                        <span className="race-subrace-traits">{sr.racial_traits.map((t) => t.name).join(', ')}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="race-traits">
              {selected.traits.filter((t) => !HIDDEN_TRAITS.has(t.index)).map((t) => (
                <TraitCard key={t.index} trait={t} />
              ))}
              {subrace?.racial_traits.map((t) => (
                <TraitCard key={`sub-${t.index}`} trait={t} from={subrace.name} />
              ))}
            </div>

            <div className="race-spotlight-foot">
              {!selected.homebrew && selected.source && (
                <span>
                  {selected.source}
                  {!isCoreRace(selected) && ' · traits summarised, see the book for full rules'}
                </span>
              )}
              {selected.homebrew && (
                <>
                  {selected.source_url && (
                    <a href={selected.source_url} target="_blank" rel="noopener noreferrer">Source page ↗</a>
                  )}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setHomebrewEditor({ open: true, existing: selected })}>
                    Edit homebrew
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={gridRef} />
      {loading && <p className="text-muted-theme">Loading races...</p>}
      {!loading && (
        <div className="race-picker-toolbar mb-3">
          <input
            type="search"
            className="form-control input-theme form-control-sm"
            placeholder="Search races"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search races"
          />
          <div className="race-picker-filters" role="group" aria-label="Filter races">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`race-filter ${filter === f.key ? 'is-active' : ''}`}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!loading && shownRaces.length === 0 && (
        <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
          No races match. Try another search, or make it as a homebrew race.
        </p>
      )}

      <div className="race-grid">
        {shownRaces.map((r) => {
          const isSelected = r.index === selectedRaceIndex;
          return (
            <button
              key={r.index}
              type="button"
              className={`race-tile ${isSelected ? 'race-tile--selected' : ''}`}
              onClick={() => pickRace(r)}
              aria-pressed={isSelected}
            >
              <RaceIcon index={raceIconKey(r)} size="2.4rem" />
              <span className="race-tile-name">{r.name}</span>
              {r.homebrew && <span className="homebrew-badge">Homebrew</span>}
            </button>
          );
        })}
        {!loading && (
          <button
            type="button"
            className="race-tile homebrew-add-tile"
            onClick={() => setHomebrewEditor({ open: true, existing: null })}
          >
            <span className="race-tile-plus" aria-hidden="true">＋</span>
            <span className="race-tile-name">Homebrew</span>
          </button>
        )}
      </div>

      <HomebrewModal
        kind="race"
        isOpen={homebrewEditor.open}
        existing={homebrewEditor.existing}
        onClose={() => setHomebrewEditor({ open: false, existing: null })}
        onSaved={(race) => {
          if (!homebrewEditor.existing || homebrewEditor.existing.index === selectedRaceIndex) {
            onSelect({ raceIndex: race.index, raceName: race.name });
          }
        }}
      />
    </div>
  );
};

export default RaceIconPicker;
