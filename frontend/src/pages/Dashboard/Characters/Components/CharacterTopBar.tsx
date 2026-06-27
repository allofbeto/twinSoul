import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  name: string;
  race: string;
  level: number;
  isDirty: boolean;
  saving: boolean;
  success: string;
  error: string;
}

const CharacterTopBar = ({ name, race, level, isDirty, saving, success, error }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="sticky-save-bar">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h2 className="text-theme mb-0">{name}</h2>
          <small className="text-muted-theme">{race} — Level {level}</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {success && <span className="text-success">{success}</span>}
          {error && <span className="text-danger">{error}</span>}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/dashboard/characters')}
          >
            ← Back
          </button>
          {isDirty && (
            <button type="submit" className="btn btn-theme-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterTopBar;