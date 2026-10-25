import React from 'react';
import '../../../../styles/characterAura.css';

interface Props {
  hue?: number;
  size?: number;
}

// Stand-in for a character portrait until real avatars/art exist: a
// self-contained CSS animation (no images, no JS loop) that flickers like
// flame and slowly drifts through color the longer it's on screen. `hue`
// lets callers tint it toward a class/race's theme color.
const CharacterAura = ({ hue = 250, size = 180 }: Props) => (
  <div
    className="character-aura"
    style={{ ['--aura-hue' as any]: hue, width: size, height: size }}
  >
    <div className="character-aura-blob b1" />
    <div className="character-aura-blob b2" />
    <div className="character-aura-blob b3" />
    <div className="character-aura-core" />
  </div>
);

export default CharacterAura;
