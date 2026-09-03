import React, { useState } from 'react';

interface Props {
  imageUrl?: string;
  challengeRating: string;
  currentHp: number;
  armorClass: number;
  onChallengeRatingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (url: string) => void;
  isOwner: boolean;
}

const NpcArtBox = ({
  imageUrl, challengeRating, currentHp, armorClass,
  onChallengeRatingChange, handleNumberChange, onImageUrlChange, isOwner,
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
          <img src={imageUrl} alt="NPC art" className="character-art-img" />
        ) : (
          <div className="character-art-placeholder">
            <span>{isOwner ? '+ Add Art' : 'No Art'}</span>
          </div>
        )}
      </div>

      <div className="character-stat-strip">
        <div className="character-stat">
          <span className="stat-label">CR</span>
          <input
            type="text"
            name="challenge_rating"
            className="stat-input"
            value={challengeRating}
            onChange={onChallengeRatingChange}
            placeholder="—"
            disabled={!isOwner}
          />
        </div>
        <div className="character-stat">
          <span className="stat-label">HP</span>
          <input
            type="number"
            name="current_hp"
            className="stat-input"
            value={currentHp}
            onChange={handleNumberChange}
            min={0}
            disabled={!isOwner}
          />
        </div>
        <div className="character-stat">
          <span className="stat-label">AC</span>
          <input
            type="number"
            name="armor_class"
            className="stat-input"
            value={armorClass}
            onChange={handleNumberChange}
            min={0}
            disabled={!isOwner}
          />
        </div>
      </div>
    </div>
  );
};

export default NpcArtBox;
