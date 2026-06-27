import React from 'react';

interface Props {
  imageUrl?: string;
  level: number;
  current_hp: number;
  armor_class: number;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CharacterArtBox = ({ imageUrl, level, current_hp, armor_class, handleNumberChange }: Props) => {
  return (
    <div className="character-art-wrapper">
      <div className="character-art-box">
        {imageUrl ? (
          <img src={imageUrl} alt="Character art" className="character-art-img" />
        ) : (
          <div className="character-art-placeholder">
            <span>+ Add Art</span>
          </div>
        )}
      </div>
      <div className="character-stat-strip">
        <div className="character-stat">
          <span className="stat-label">LVL</span>
          <input
            type="number"
            name="level"
            className="stat-input"
            value={level}
            onChange={handleNumberChange}
            min={1}
            max={20}
          />
        </div>
        <div className="character-stat">
          <span className="stat-label">HP</span>
          <input
            type="number"
            name="current_hp"
            className="stat-input"
            value={current_hp}
            onChange={handleNumberChange}
            min={0}
          />
        </div>
        <div className="character-stat">
          <span className="stat-label">AC</span>
          <input
            type="number"
            name="armor_class"
            className="stat-input"
            value={armor_class}
            onChange={handleNumberChange}
            min={0}
          />
        </div>
      </div>
    </div>
  );
};

export default CharacterArtBox;