import React, { useRef, useState } from 'react';

// Inputs for the character sheet. Values commit on Enter or when you leave the
// field, so each edit is one undo step; Escape backs out without changing anything.

interface NumberFieldProps {
  value: number | null;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  /** Shown when there's no value (e.g. the race's speed under an override). */
  fallback?: number;
  /** How the value reads when not being edited, e.g. "+3". */
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  title?: string;
  'aria-label': string;
}

const clamp = (n: number, min?: number, max?: number) =>
  Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

/**
 * A number you tap to retype: it clears on focus (the old value stays as a
 * faint placeholder), so there's nothing to delete first. Leaving it empty
 * keeps the old value.
 */
export const NumberField = ({ value, onCommit, min, max, fallback, format, className = '', style, disabled, title, ...aria }: NumberFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const allowNegative = min === undefined || min < 0;
  const shown = value ?? fallback;
  const display = shown === undefined || shown === null ? '' : format ? format(shown) : String(shown);

  const commit = () => {
    const text = draft;
    setDraft(null);
    if (cancelled.current) { cancelled.current = false; return; }
    if (text === null || text.trim() === '' || text.trim() === '-') return;
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) return;
    const next = clamp(n, min, max);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      // Phones show the number pad; it has no minus key, so fields that
      // take negatives get the full keyboard.
      inputMode={allowNegative ? 'text' : 'numeric'}
      pattern={allowNegative ? '-?[0-9]*' : '[0-9]*'}
      enterKeyHint="done"
      autoComplete="off"
      className={`sheet-field ${value === null ? 'is-fallback' : ''} ${className}`}
      style={style}
      value={draft ?? display}
      placeholder={draft !== null ? display : undefined}
      onFocus={() => setDraft('')}
      onChange={(e) => {
        // Drops anything but digits (and a leading minus), so "+3" reads as 3.
        const cleaned = e.target.value.replace(allowNegative ? /[^0-9-]/g : /[^0-9]/g, '').replace(/(?!^)-/g, '');
        setDraft(cleaned);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur(); }
      }}
      disabled={disabled}
      title={title}
      {...aria}
    />
  );
};

interface TextFieldProps {
  value: string;
  onCommit: (value: string) => void;
  /** Empty isn't allowed: leaving it blank keeps the old value. */
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** id of a <datalist> with suggestions. */
  list?: string;
  className?: string;
  disabled?: boolean;
  'aria-label': string;
}

/** Text you tap to edit: selects everything on focus, so typing replaces it. */
export const TextField = ({ value, onCommit, required, placeholder, maxLength = 80, list, className = '', disabled, ...aria }: TextFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);

  const commit = () => {
    const text = (draft ?? value).trim();
    setDraft(null);
    if (cancelled.current) { cancelled.current = false; return; }
    if (required && !text) return;
    if (text !== value) onCommit(text);
  };

  return (
    <input
      type="text"
      enterKeyHint="done"
      className={`sheet-field sheet-field--text ${className}`}
      value={draft ?? value}
      placeholder={placeholder}
      maxLength={maxLength}
      list={list}
      onFocus={(e) => { setDraft(value); e.currentTarget.select(); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur(); }
      }}
      disabled={disabled}
      {...aria}
    />
  );
};

interface OverridableProps {
  /** What the sheet works out. */
  auto: number;
  /** The table's own value, if set. */
  value: number | undefined;
  /** null = back to the calculated value. */
  onChange: (value: number | null) => void;
  editable: boolean;
  signed?: boolean;
  min?: number;
  max?: number;
  className?: string;
  'aria-label': string;
}

const signedText = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * A calculated number the table can overrule: tap to type your own. A dot
 * marks hand-set values; "auto" puts the calculation back.
 */
export const OverridableNumber = ({ auto, value, onChange, editable, signed, min, max, className = '', ...aria }: OverridableProps) => {
  const custom = value !== undefined && value !== auto;
  const shown = custom ? value! : auto;
  const fmt = signed ? signedText : undefined;
  const hint = custom ? `Set by hand. Calculated: ${fmt ? fmt(auto) : auto}` : 'Calculated. Tap to set your own';

  if (!editable) {
    return (
      <span className={`sheet-ovr ${custom ? 'is-custom' : ''} ${className}`} title={custom ? hint : undefined}>
        <span className="sheet-ovr-value">{fmt ? fmt(shown) : shown}</span>
        {custom && <span className="sheet-ovr-dot" aria-label="set by hand" />}
      </span>
    );
  }

  return (
    <span className={`sheet-ovr ${custom ? 'is-custom' : ''} ${className}`}>
      <NumberField
        className="sheet-ovr-input"
        value={shown}
        format={fmt}
        min={min ?? (signed ? -99 : 0)}
        max={max ?? 999}
        onCommit={(n) => onChange(n === auto ? null : n)}
        title={hint}
        {...aria}
      />
      {custom && (
        <button type="button" className="sheet-ovr-reset" onClick={() => onChange(null)} title={`Back to calculated (${fmt ? fmt(auto) : auto})`}>
          auto
        </button>
      )}
    </span>
  );
};
