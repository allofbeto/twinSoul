import React, { useState } from 'react';

interface Props {
  imageUrl?: string;
  level: number;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  temp_hp: number;
  temp_ac_bonus: number;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (url: string) => void;
  onRequestLevelUp: () => void;
  isOwner: boolean;
}

const CharacterArtBox = ({
  imageUrl, level, max_hp, current_hp, armor_class, temp_hp, temp_ac_bonus,
  handleNumberChange, onImageUrlChange, onRequestLevelUp, isOwner,
}: Props) => {
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || '');

  const handleConfirm = () => {
    onImageUrlChange(urlInput);
    setEditing(false);
  };

  return (
    <div className="character-art-wrapper">
      <div
        className="character-art-box"
        onClick={() => isOwner && !editing && setEditing(true)}
        style={{ cursor: isOwner ? 'pointer' : 'default' }}
      >
        {editing && isOwner ? (
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
            <span>{isOwner ? '+ Add Art' : 'No Art'}</span>
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
            disabled={!isOwner}
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
            disabled={!isOwner}
          />
          <span className="stat-hint">/ {max_hp}{temp_hp > 0 ? ` +${temp_hp}` : ''}</span>
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
            disabled={!isOwner}
          />
          {temp_ac_bonus !== 0 && (
            <span className="stat-hint">{temp_ac_bonus > 0 ? '+' : ''}{temp_ac_bonus} = {armor_class + temp_ac_bonus}</span>
          )}
        </div>
      </div>

      {/* Session-scoped, not permanent: cleared manually when the effect ends. */}
      <div className="character-stat-strip character-stat-strip--temp">
        <div className="character-stat">
          <span className="stat-label">Temp HP</span>
          <input
            type="number"
            name="temp_hp"
            className="stat-input"
            value={temp_hp}
            onChange={handleNumberChange}
            min={0}
            disabled={!isOwner}
          />
        </div>
        <div className="character-stat">
          <span className="stat-label">Temp AC</span>
          <input
            type="number"
            name="temp_ac_bonus"
            className="stat-input"
            value={temp_ac_bonus}
            onChange={handleNumberChange}
            disabled={!isOwner}
          />
        </div>
        {isOwner && (
          <div className="character-stat character-stat--action">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onRequestLevelUp}
              disabled={level >= 20}
            >
              Level Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterArtBox;
