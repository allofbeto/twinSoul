import React, { useState, useRef, useEffect } from 'react';
import { DND_CLASSES } from '../constants';

interface Props {
  selected: string[];
  onToggle: (cls: string) => void;
  onAdd: (cls: string) => void;
}

const ClassSelector = ({ selected, onToggle, onAdd }: Props) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = DND_CLASSES.filter(
    (cls) =>
      cls.toLowerCase().includes(input.toLowerCase()) &&
      !selected.includes(cls)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (cls: string) => {
    onAdd(cls);
    setInput('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      if (filtered.length > 0) {
        handleSelect(filtered[0]);
      } else if (!selected.includes(trimmed)) {
        onAdd(trimmed);
        setInput('');
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className="card-theme p-4 mb-4">
      <h5 className="text-theme mb-3">Classes</h5>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {selected.map((cls) => (
            <span key={cls} className="badge-cls">
              {cls}
              <button
                type="button"
                className="badge-cls-remove"
                onClick={() => onToggle(cls)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search + dropdown */}
      <div style={{ position: 'relative' }} ref={wrapperRef}>
        <input
          type="text"
          className="form-control input-theme"
          placeholder="Search or create a class..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
        />
        {showSuggestions && (input.length > 0 || filtered.length > 0) && (
          <div className="class-suggestions">
            {filtered.map((cls) => (
              <div
                key={cls}
                className="class-suggestion-item"
                onMouseDown={() => handleSelect(cls)}
              >
                {cls}
              </div>
            ))}
            {input.trim() && !DND_CLASSES.includes(input.trim()) && !selected.includes(input.trim()) && (
              <div
                className="class-suggestion-item class-suggestion-create"
                onMouseDown={() => handleSelect(input.trim())}
              >
                + Create "{input.trim()}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassSelector;