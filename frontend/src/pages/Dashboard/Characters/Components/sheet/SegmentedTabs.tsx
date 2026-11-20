import React from 'react';

interface Option<K extends string> {
  key: K;
  label: string;
  count?: number;
}

interface Props<K extends string> {
  options: Option<K>[];
  value: K;
  onChange: (key: K) => void;
  'aria-label': string;
}

// Small filter tabs inside a panel (feats by source, actions by timing...).
// Scrolls sideways on narrow screens instead of wrapping.
function SegmentedTabs<K extends string>({ options, value, onChange, ...aria }: Props<K>) {
  return (
    <div className="sheet-segments" role="tablist" {...aria}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={`sheet-segment ${value === o.key ? 'is-active' : ''}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
          {o.count !== undefined && <span className="sheet-segment-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export default SegmentedTabs;
