import React from 'react';
import '../../../../styles/homebrew.css';

// Classes with a drawn icon in public/class-icons/<key>.png. "mystic" has no
// class of its own; homebrew classes can borrow it (or any other).
export const CLASS_ICON_KEYS = [
  'artificer', 'barbarian', 'bard', 'blood-hunter', 'cleric', 'druid', 'fighter', 'monk',
  'mystic', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
];

export const classIconKey = (cls: { index: string; icon?: string | null } | undefined | null) =>
  cls ? cls.icon || cls.index : '';

export const classIconUrl = (key: string) =>
  CLASS_ICON_KEYS.includes(key) ? `${process.env.PUBLIC_URL || ''}/class-icons/${key}.png` : null;

interface Props {
  iconKey: string;
  fallback?: string; // glyph for classes without a drawing
  size?: string;
  className?: string;
}

// Drawn class icon tinted with the current text colour; falls back to a glyph.
const ClassIcon = ({ iconKey, fallback = '✨', size = '2rem', className = '' }: Props) => {
  const url = classIconUrl(iconKey);
  if (!url) {
    return (
      <span className={className} style={{ fontSize: `calc(${size} * 0.8)`, lineHeight: 1 }} aria-hidden="true">
        {fallback}
      </span>
    );
  }
  return (
    <span
      className={`race-icon ${className}`}
      style={{ width: size, height: size, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})` }}
      aria-hidden="true"
    />
  );
};

export default ClassIcon;
