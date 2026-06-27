import React, { useState, useRef, useEffect } from 'react';
import { DND_RACES } from '../constants';

interface Props {
  max_hp: number;
  race: string;
  classes: string[];
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onToggleClass: (cls: string) => void;
  setFieldValue: (field: string, value: string) => void;
}

const CharacterSidebar = ({ max_hp, race, classes, handleNumberChange, handleChange, onToggleClass, setFieldValue }: Props) => {
  const [raceSearch, setRaceSearch] = useState(race);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = DND_RACES.filter((r) =>
    r.toLowerCase().includes(raceSearch.toLowerCase())
  );

  useEffect(() => {
    setRaceSearch(race);
  }, [race]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRaceSelect = (r: string) => {
    setRaceSearch(r);
    setFieldValue('race', r);
    setShowSuggestions(false);
  };

  const handleRaceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaceSearch(e.target.value);
    setFieldValue('race', e.target.value);
    setShowSuggestions(true);
  };

  return (
    <div className="character-sidebar card-theme p-4">
      <div className="character-sidebar-row">
        <span className="text-muted-theme">Max HP</span>
        <input
          type="number"
          name="max_hp"
          className="stat-input-inline"
          value={max_hp}
          onChange={handleNumberChange}
          min={0}
        />
      </div>
      <hr className="sidebar-divider" />

      {/* Race */}
      <div className="character-sidebar-row" style={{ position: 'relative' }} ref={wrapperRef}>
        <span className="text-muted-theme">
          Race <span className="editable-hint">✎</span>
        </span>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="stat-input-inline"
            value={raceSearch}
            onChange={handleRaceInput}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Type to search..."
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="race-suggestions">
              {filtered.map((r) => (
                <div
                  key={r}
                  className="race-suggestion-item"
                  onMouseDown={() => handleRaceSelect(r)}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <hr className="sidebar-divider" />
      <div className="character-sidebar-col">
        <span className="text-muted-theme mb-2">Classes</span>
        <div className="d-flex flex-wrap gap-1 mt-2">
          {classes.length > 0 ? classes.map((cls) => (
            <span
              key={cls}
              className="badge-cls"
              onClick={() => onToggleClass(cls)}
              style={{ cursor: 'pointer' }}
            >
              {cls} ×
            </span>
          )) : <span className="text-muted-theme">None selected</span>}
        </div>
      </div>
    </div>
  );
};

export default CharacterSidebar;