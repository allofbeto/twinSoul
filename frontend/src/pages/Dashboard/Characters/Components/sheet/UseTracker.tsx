import React from 'react';

interface Props {
  label: string;
  total: number;
  used: number;
  onChange?: (used: number) => void; // omitted = read-only
  hint?: string;
  /** Extra controls beside the label (e.g. a maximum editor). */
  extra?: React.ReactNode;
}

// Past this many uses, a row of pips gets unreadable; show a counter instead.
const MAX_PIPS = 10;

// A limited resource you tick off at the table: spell slots, rages, ki...
// Filled pips are what's still available. Tapping a filled pip spends one;
// tapping an empty one gets one back.
const UseTracker = ({ label, total, used, onChange, hint, extra }: Props) => {
  const available = total - used;
  const set = (n: number) => onChange?.(Math.max(0, Math.min(total, n)));
  const spent = total > 0 && available <= 0;

  return (
    <div className={`sheet-tracker ${spent ? 'is-spent' : ''}`}>
      <div className="sheet-tracker-label">
        <span>{label}</span>
        {spent && <span className="sheet-chip sheet-chip--warn" role="status">Used up</span>}
        {hint && <span className="sheet-tracker-hint">{spent ? `back after ${hint}` : hint}</span>}
        {extra}
      </div>
      {total === 0 ? (
        <span className="sheet-tracker-hint">none</span>
      ) : total <= MAX_PIPS ? (
        <div className="sheet-pips" role="group" aria-label={`${label}: ${available} of ${total} left`}>
          {Array.from({ length: total }, (_, i) => {
            const filled = i < available;
            return (
              <button
                key={i}
                type="button"
                className={`sheet-pip ${filled ? 'is-filled' : ''}`}
                onClick={() => set(filled ? used + 1 : used - 1)}
                disabled={!onChange}
                title={filled ? 'Use one' : 'Get one back'}
                aria-label={filled ? `Use one ${label}` : `Restore one ${label}`}
              />
            );
          })}
        </div>
      ) : (
        <div className="sheet-counter">
          <button type="button" className="sheet-counter-btn" onClick={() => set(used + 1)} disabled={!onChange || available <= 0} aria-label={`Use one ${label}`}>−</button>
          <span className="sheet-counter-value"><strong>{available}</strong> / {total}</span>
          <button type="button" className="sheet-counter-btn" onClick={() => set(used - 1)} disabled={!onChange || used <= 0} aria-label={`Restore one ${label}`}>+</button>
        </div>
      )}
    </div>
  );
};

export default UseTracker;
