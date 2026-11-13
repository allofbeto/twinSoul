import React from 'react';
import { raceFallbackGlyph, raceIconUrl } from '../raceTypes';
import '../../../../styles/homebrew.css';

interface Props {
  index: string;
  size?: string; // any CSS length
  className?: string;
}

// Drawn race icon, tinted with the current text colour (so it follows the
// theme). Races without a drawing get a fallback glyph.
const RaceIcon = ({ index, size = '2rem', className = '' }: Props) => {
  const url = raceIconUrl(index);
  if (!url) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">
        {raceFallbackGlyph(index)}
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

export default RaceIcon;
