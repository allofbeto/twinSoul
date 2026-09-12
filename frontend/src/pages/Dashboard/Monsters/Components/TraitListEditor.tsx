import React from 'react';

export interface TraitEntry {
  name: string;
  desc: string;
}

interface Props {
  title: string;
  entries: TraitEntry[];
  onChange: (entries: TraitEntry[]) => void;
  disabled: boolean;
}

const TraitListEditor = ({ title, entries, onChange, disabled }: Props) => {
  const updateEntry = (index: number, field: keyof TraitEntry, value: string) => {
    const next = entries.map((e, i) => (i === index ? { ...e, [field]: value } : e));
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([...entries, { name: '', desc: '' }]);
  };

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="text-theme mb-0">{title}</h6>
        {!disabled && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addEntry}>
            + Add
          </button>
        )}
      </div>

      {entries.length === 0 && (
        <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>None yet.</p>
      )}

      {entries.map((entry, i) => (
        <div key={i} className="d-flex gap-2 align-items-start mb-2">
          <div style={{ flex: '0 0 30%' }}>
            <input
              type="text"
              className="form-control input-theme"
              placeholder="Name"
              value={entry.name}
              onChange={(e) => updateEntry(i, 'name', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              className="form-control input-theme"
              placeholder="Description"
              rows={2}
              value={entry.desc}
              onChange={(e) => updateEntry(i, 'desc', e.target.value)}
              disabled={disabled}
            />
          </div>
          {!disabled && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => removeEntry(i)}
              style={{ flex: '0 0 auto' }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default TraitListEditor;
