import React from 'react';
import { EntryDraft } from './draftTypes';

interface Props {
  entries: EntryDraft[];
  onChange: (entries: EntryDraft[]) => void;
  noun: string; // "trait", "feature"
  withLevel?: boolean;
}

// Repeating name + description rows (racial traits, class features), with
// an optional "gained at level" column.
const EntryListEditor = ({ entries, onChange, noun, withLevel = false }: Props) => {
  const update = (i: number, patch: Partial<EntryDraft>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => {
    const lastLevel = entries.length ? entries[entries.length - 1].level || 1 : 1;
    onChange([...entries, withLevel ? { level: lastLevel, name: '', desc: '' } : { name: '', desc: '' }]);
  };

  return (
    <div className="d-flex flex-column gap-2">
      {entries.length === 0 && (
        <p className="text-muted-theme mb-0" style={{ fontSize: '0.8rem' }}>No {noun}s yet.</p>
      )}
      {entries.map((e, i) => (
        <div key={i} className="homebrew-entry">
          <div className="d-flex gap-2 align-items-center">
            {withLevel && (
              <label className="d-flex align-items-center gap-1 text-muted-theme" style={{ fontSize: '0.75rem' }}>
                Lvl
                <input
                  type="number"
                  className="form-control input-theme form-control-sm"
                  style={{ width: '4.2rem' }}
                  min={1}
                  max={20}
                  value={e.level ?? 1}
                  onChange={(ev) => update(i, { level: Math.min(20, Math.max(1, parseInt(ev.target.value) || 1)) })}
                  aria-label={`${noun} level`}
                />
              </label>
            )}
            <input
              type="text"
              className="form-control input-theme form-control-sm"
              placeholder={`${noun[0].toUpperCase()}${noun.slice(1)} name`}
              value={e.name}
              onChange={(ev) => update(i, { name: ev.target.value })}
              aria-label={`${noun} name`}
            />
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => remove(i)} aria-label={`Remove ${noun}`}>
              ✕
            </button>
          </div>
          <textarea
            className="form-control input-theme form-control-sm mt-1"
            rows={2}
            placeholder="What it does. Leave a blank line between paragraphs."
            value={e.desc}
            onChange={(ev) => update(i, { desc: ev.target.value })}
            aria-label={`${noun} description`}
          />
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={add}>
          + Add {noun}
        </button>
      </div>
    </div>
  );
};

export default EntryListEditor;
