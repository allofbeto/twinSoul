import React, { useState, useRef, useEffect } from 'react';
import { DND_RACES, DND_CLASSES } from '../constants';

interface Props {
  max_hp: number;
  gold: number;
  inspo: number;
  race: string;
  classes: string[];
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onToggleClass: (cls: string) => void;
  onAddClass: (cls: string) => void;
  setFieldValue: (field: string, value: string) => void;
}

const CharacterSidebar = ({ max_hp, inspo, gold, race, classes, handleNumberChange, handleChange, onToggleClass, onAddClass, setFieldValue }: Props) => {
  const [raceSearch, setRaceSearch] = useState(race);
  const [showRaceSuggestions, setShowRaceSuggestions] = useState(false);
  const [classInput, setClassInput] = useState('');
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const raceRef = useRef<HTMLDivElement>(null);
  const classRef = useRef<HTMLDivElement>(null);

  const filteredRaces = DND_RACES.filter((r) =>
    r.toLowerCase().includes(raceSearch.toLowerCase())
  );

  const filteredClasses = DND_CLASSES.filter(
    (cls) =>
      cls.toLowerCase().includes(classInput.toLowerCase()) &&
      !classes.includes(cls)
  );

  useEffect(() => {
    setRaceSearch(race);
  }, [race]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (raceRef.current && !raceRef.current.contains(e.target as Node)) {
        setShowRaceSuggestions(false);
      }
      if (classRef.current && !classRef.current.contains(e.target as Node)) {
        setShowClassSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRaceSelect = (r: string) => {
    setRaceSearch(r);
    setFieldValue('race', r);
    setShowRaceSuggestions(false);
  };

  const handleClassSelect = (cls: string) => {
    onAddClass(cls);
    setClassInput('');
    setShowClassSuggestions(false);
  };

  const handleClassKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = classInput.trim();
      if (!trimmed) return;
      if (filteredClasses.length > 0) {
        handleClassSelect(filteredClasses[0]);
      } else if (!classes.includes(trimmed)) {
        onAddClass(trimmed);
        setClassInput('');
        setShowClassSuggestions(false);
      }
    }
  };

  return (
    <div className="character-sidebar card-theme p-4">
      {/* Max HP */}
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
      
      {/* Inspo */}
      <div className="character-sidebar-row">
        <span className="text-muted-theme">Inspiration</span>
        <input
          type="number"
          name="inspo"
          className="stat-input-inline"
          value={inspo}
          onChange={handleNumberChange}
          min={0}
        />
      </div>
      <hr className="sidebar-divider" />

      {/* Gold */}
      <div className="character-sidebar-row">
        <span className="text-muted-theme">Gold</span>
        <input
          type="number"
          name="gold"
          className="stat-input-inline"
          value={gold}
          onChange={handleNumberChange}
          min={0}
        />
      </div>
      <hr className="sidebar-divider" />

      {/* Race */}
      <div className="character-sidebar-col">
        <span className="text-muted-theme mb-2">Race <span className="editable-hint">✎</span></span>

        {/* Race search input */}
        <div style={{ position: 'relative' }} ref={raceRef}>
          <input
            type="text"
            className="form-control input-theme mt-2"
            style={{ fontSize: '0.85rem' }}
            placeholder="Search or create a race..."
            value={raceSearch}
            onChange={(e) => {
              setRaceSearch(e.target.value);
              setFieldValue('race', e.target.value);
              setShowRaceSuggestions(true);
            }}
            onFocus={() => setShowRaceSuggestions(true)}
          />
          {showRaceSuggestions && filteredRaces.length > 0 && (
            <div className="race-suggestions">
              {filteredRaces.map((r) => (
                <div key={r} className="race-suggestion-item" onMouseDown={() => handleRaceSelect(r)}>
                  {r}
                </div>
              ))}
              {raceSearch.trim() && !DND_RACES.includes(raceSearch.trim()) && (
                <div
                  className="race-suggestion-item class-suggestion-create"
                  onMouseDown={() => handleRaceSelect(raceSearch.trim())}
                >
                  + Create "{raceSearch.trim()}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected race pill */}
        {race && (
          <div className="d-flex flex-wrap gap-1 mt-2">
            <span className="badge-cls">
              {race}
              <button
                type="button"
                className="badge-cls-remove"
                onClick={() => {
                  setRaceSearch('');
                  setFieldValue('race', '');
                }}
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>
      <hr className="sidebar-divider" />

      {/* Classes */}
      <div className="character-sidebar-col">

        {/* Classes */}
        <div className="character-sidebar-col">
          <span className="text-muted-theme mb-2">Classes <span className="editable-hint">✎</span></span>

          {/* Class search input */}
          <div style={{ position: 'relative' }} ref={classRef}>
            <input
              type="text"
              className="form-control input-theme mt-2"
              style={{ fontSize: '0.85rem' }}
              placeholder="Search or create a class..."
              value={classInput}
              onChange={(e) => {
                setClassInput(e.target.value);
                setShowClassSuggestions(true);
              }}
              onFocus={() => setShowClassSuggestions(true)}
              onKeyDown={handleClassKeyDown}
            />
            {showClassSuggestions && (classInput.length > 0 || filteredClasses.length > 0) && (
              <div className="class-suggestions">
                {filteredClasses.map((cls) => (
                  <div key={cls} className="class-suggestion-item" onMouseDown={() => handleClassSelect(cls)}>
                    {cls}
                  </div>
                ))}
                {classInput.trim() && !DND_CLASSES.includes(classInput.trim()) && !classes.includes(classInput.trim()) && (
                  <div
                    className="class-suggestion-item class-suggestion-create"
                    onMouseDown={() => handleClassSelect(classInput.trim())}
                  >
                    + Create "{classInput.trim()}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected pills */}
          {classes.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-2">
              {classes.map((cls) => (
                <span key={cls} className="badge-cls">
                  {cls}
                  <button
                    type="button"
                    className="badge-cls-remove"
                    onClick={() => onToggleClass(cls)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default CharacterSidebar;