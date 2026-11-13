import React from 'react';
import RaceIcon from '../Components/RaceIcon';
import ClassIcon, { CLASS_ICON_KEYS } from '../Components/ClassIcon';
import { RACE_ICON_INDEXES } from '../raceTypes';

interface Props {
  kind: 'race' | 'class';
  value: string;
  onChange: (key: string) => void;
}

// Spare drawings (no published class uses them) are offered first.
const SPARE_CLASS_ICONS = ['mystic'];

// Lets a homebrew race or class borrow one of the drawn icons.
const IconPicker = ({ kind, value, onChange }: Props) => {
  const keys =
    kind === 'class'
      ? [...SPARE_CLASS_ICONS, ...CLASS_ICON_KEYS.filter((k) => !SPARE_CLASS_ICONS.includes(k))]
      : Array.from(RACE_ICON_INDEXES);
  return (
    <div className="homebrew-icon-picker" role="radiogroup" aria-label="Icon">
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        className={`homebrew-icon-option ${!value ? 'is-selected' : ''}`}
        onClick={() => onChange('')}
        title="No icon"
      >
        <span aria-hidden="true">🧪</span>
      </button>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={key.replace(/-/g, ' ')}
          title={key.replace(/-/g, ' ')}
          className={`homebrew-icon-option ${value === key ? 'is-selected' : ''}`}
          onClick={() => onChange(key)}
        >
          {kind === 'class' ? <ClassIcon iconKey={key} size="1.6rem" /> : <RaceIcon index={key} size="1.6rem" />}
        </button>
      ))}
    </div>
  );
};

export default IconPicker;
