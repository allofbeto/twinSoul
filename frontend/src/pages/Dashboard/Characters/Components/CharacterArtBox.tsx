import React, { useState } from 'react';

interface Props {
  imageUrl?: string;
  level: number;
  current_hp: number;
  armor_class: number;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (url: string) => void;
}

const CharacterArtBox = ({ imageUrl, level, current_hp, armor_class, handleNumberChange, onImageUrlChange }: Props) => {
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || '');

  const handleConfirm = () => {
    onImageUrlChange(urlInput);
    setEditing(false);
  };

  return (
    <div className="character-art-wrapper">
      <div className="character-art-box" onClick={() => !editing && setEditing(true)}>
        {editing ? (
          <div className="character-art-url-editor">
            <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>Paste image URL</p>
            <input
              type="text"
              className="stat-input-inline"
              style={{ width: '100%', textAlign: 'left', marginBottom: '0.5rem' }}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleConfirm}>
                Save
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : imageUrl ? (
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