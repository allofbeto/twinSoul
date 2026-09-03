import React from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignSelector from '../../Characters/Components/CampaignSelector';

const DISPOSITIONS = ['hostile', 'neutral', 'friendly'];

interface Props {
  name: string;
  disposition: string;
  onDispositionChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isDirty: boolean;
  saving: boolean;
  success: string;
  error: string;
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  isOwner: boolean;
  onDelete: () => void;
}

const NpcTopBar = ({
  name, disposition, onDispositionChange, isDirty, saving, success, error,
  campaignId, onCampaignChange, isOwner, onDelete,
}: Props) => {
  const navigate = useNavigate();

  return (
    <div className="sticky-save-bar">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h2 className="text-theme mb-2">{name}</h2>
          <div className="d-flex align-items-center gap-3">
            <select
              className={`npc-disposition-select npc-disposition-${disposition}`}
              value={disposition}
              onChange={onDispositionChange}
              disabled={!isOwner}
            >
              {DISPOSITIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <CampaignSelector
              campaignId={campaignId}
              onChange={onCampaignChange}
            />
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {success && <span className="text-success">{success}</span>}
          {error && <span className="text-danger">{error}</span>}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/dashboard/npcs')}
          >
            ← Back
          </button>
          {isOwner && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
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

export default NpcTopBar;
