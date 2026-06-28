import React, { useState, useRef, useEffect } from 'react';

interface Props {
  options: string[];
  selected: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  multiSelect?: boolean;
  allowCreate?: boolean;
}

const SearchBubbleInput = ({
  options,
  selected,
  onAdd,
  onRemove,
  placeholder = 'Search...',
  multiSelect = true,
  allowCreate = true,
}: Props) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    (opt) =>
      opt.toLowerCase().includes(input.toLowerCase()) &&
      (multiSelect ? !selected.includes(opt) : true)
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

  const handleSelect = (value: string) => {
    if (!multiSelect) {
      // Remove existing selection first
      selected.forEach((s) => onRemove(s));
    }
    onAdd(value);
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
      } else if (allowCreate && !selected.includes(trimmed)) {
        handleSelect(trimmed);
      }
    }
    if (e.key === 'Backspace' && input === '' && selected.length > 0) {
      onRemove(selected[selected.length - 1]);
    }
  };

  return (
    <div className="search-bubble-wrapper" ref={wrapperRef}>
      <div
        className="search-bubble-input-box"
        onClick={() => wrapperRef.current?.querySelector('input')?.focus()}
      >
        {/* Pills inside input */}
        {selected.map((val) => (
          <span key={val} className="badge-cls">
            {val}
            <button
              type="button"
              className="badge-cls-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(val);
              }}
            >
              ×
            </button>
          </span>
        ))}

        <input
          type="text"
          className="search-bubble-text-input"
          placeholder={selected.length === 0 ? placeholder : ''}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showSuggestions && (input.length > 0 || filtered.length > 0) && (
        <div className="search-bubble-suggestions">
          {filtered.map((opt) => (
            <div
              key={opt}
              className="search-bubble-suggestion-item"
              onMouseDown={() => handleSelect(opt)}
            >
              {opt}
            </div>
          ))}
          {allowCreate && input.trim() && !options.includes(input.trim()) && !selected.includes(input.trim()) && (
            <div
              className="search-bubble-suggestion-item search-bubble-create"
              onMouseDown={() => handleSelect(input.trim())}
            >
              + Create "{input.trim()}"
            </div>
          )}
          {filtered.length === 0 && !allowCreate && (
            <div className="search-bubble-suggestion-item search-bubble-empty">
              No results
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBubbleInput;