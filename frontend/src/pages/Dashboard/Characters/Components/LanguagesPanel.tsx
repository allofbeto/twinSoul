import React, { useState } from 'react';
import { ALL_LANGUAGES } from '../languages';

interface Props {
  languages: string[];
  onChange: (languages: string[]) => void;
  isOwner: boolean;
}

// The languages a character speaks, editable by its owner.
const LanguagesPanel = ({ languages, onChange, isOwner }: Props) => {
  const [adding, setAdding] = useState('');
  const options = ALL_LANGUAGES.filter((l) => !languages.includes(l));

  const add = (lang: string) => {
    const clean = lang.trim();
    if (!clean || languages.some((l) => l.toLowerCase() === clean.toLowerCase())) return;
    onChange([...languages, clean]);
    setAdding('');
  };

  return (
    <div className="mt-3">
      <div className="text-muted-theme mb-2" style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Languages
      </div>
      <div className="d-flex flex-wrap gap-1 align-items-center">
        {languages.map((lang) => (
          <span key={lang} className="badge-cls d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
            {lang}
            {isOwner && (
              <button
                type="button"
                className="btn btn-link p-0 text-reset"
                style={{ fontSize: '0.8rem', lineHeight: 1, textDecoration: 'none' }}
                onClick={() => onChange(languages.filter((l) => l !== lang))}
                aria-label={`Remove ${lang}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {languages.length === 0 && <span className="text-muted-theme" style={{ fontSize: '0.85rem' }}>None yet.</span>}
      </div>
      {isOwner && (
        <form
          className="d-flex gap-2 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(adding);
          }}
        >
          <input
            className="form-control form-control-sm input-theme"
            list="language-options"
            placeholder="Add a language"
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            maxLength={40}
            aria-label="Add a language"
          />
          <datalist id="language-options">
            {options.map((l) => <option key={l} value={l} />)}
          </datalist>
          <button type="submit" className="btn btn-sm btn-outline-secondary" disabled={!adding.trim()}>Add</button>
        </form>
      )}
    </div>
  );
};

export default LanguagesPanel;
