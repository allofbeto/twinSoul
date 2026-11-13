import React from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignSelector from './CampaignSelector';
import { getGameSystem } from '../gameSystems';
import { HomebrewStatus, HomebrewStatusChip } from './HomebrewStatusNotice';

interface Props {
  name: string;
  race: string;
  background?: string | null;
  level: number;
  game: string;
  isDirty: boolean;
  saving: boolean;
  success: string;
  error: string;
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  homebrewStatus?: HomebrewStatus;
}

const CharacterTopBar = ({ name, race, background, level, game, isDirty, saving, success, error, campaignId, onCampaignChange, homebrewStatus }: Props) => {
  const navigate = useNavigate();
  const gameName = getGameSystem(game)?.name || game;

  return (
    <div className="sticky-save-bar">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h2 className="text-theme mb-2">{name}</h2>
          <div className="d-flex align-items-center gap-3" style={{width: '90vh'}}>
            <small className="text-muted-theme">{race}{background ? ` · ${background}` : ''} — Level {level} · {gameName}</small>
            <CampaignSelector
              campaignId={campaignId}
              onChange={onCampaignChange}
            />
            <HomebrewStatusChip status={homebrewStatus} />
          </div>
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