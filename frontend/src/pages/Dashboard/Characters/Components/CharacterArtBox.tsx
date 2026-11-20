import React, { useState } from 'react';

interface Props {
  imageUrl?: string;
  name: string;
  onImageUrlChange: (url: string) => void;
  isOwner: boolean;
}

// The character's portrait. Its owner taps it to paste a new image link.
const CharacterArtBox = ({ imageUrl, name, onImageUrlChange, isOwner }: Props) => {
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || '');

  const handleConfirm = () => {
    onImageUrlChange(urlInput.trim());
    setEditing(false);
  };

  if (editing && isOwner) {
    return (
      <div className="sheet-portrait sheet-portrait--editing">
        <label className="sheet-label" htmlFor="portrait-url">Image link</label>
        <input
          id="portrait-url"
          type="url"
          className="form-control input-theme form-control-sm"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="https://..."
          autoFocus
        />
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleConfirm} disabled={!urlInput.trim()}>Save</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="sheet-portrait"
      onClick={() => { setUrlInput(imageUrl || ''); setEditing(true); }}
      disabled={!isOwner}
      aria-label={isOwner ? 'Change portrait' : `${name} portrait`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={`${name} portrait`} />
      ) : (
        <span className="sheet-portrait-empty">
          <span className="sheet-portrait-initial" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
          {isOwner && <span>Add portrait</span>}
        </span>
      )}
      {isOwner && imageUrl && <span className="sheet-portrait-edit">Change</span>}
    </button>
  );
};

export default CharacterArtBox;
