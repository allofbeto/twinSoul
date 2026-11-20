import React from 'react';
import { useNavigate } from 'react-router-dom';
import CampaignSelector from './CampaignSelector';
import { getGameSystem } from '../gameSystems';
import { HomebrewStatus, HomebrewStatusChip } from './HomebrewStatusNotice';
import { TextField } from './sheet/fields';
import { SaveStatus } from '../useSheetEditor';
import { DockAction } from '../dockAction';

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  /** "Hill Dwarf · Fighter 3 / Wizard 2 · Sage" */
  subtitle: string;
  game: string;
  status: SaveStatus;
  message: string;
  error: string;
  onRetry: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  onUndo: () => void;
  onRedo: () => void;
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  homebrewStatus?: HomebrewStatus;
  isOwner: boolean;
  /** Phones: the current tab's add button, shown in the dock. */
  dockAction?: DockAction | null;
  /** Embedded (e.g. in the Theatre): no Back button. */
  embedded?: boolean;
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: 'All changes saved',
  pending: 'Saving…',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: "Couldn't save",
};

const CharacterTopBar = ({
  name, onNameChange, subtitle, game, status, message, error, onRetry,
  canUndo, canRedo, undoLabel, redoLabel, onUndo, onRedo,
  campaignId, onCampaignChange, homebrewStatus, isOwner, dockAction, embedded,
}: Props) => {
  const navigate = useNavigate();
  const gameName = getGameSystem(game)?.name || game;

  return (
    <div className="sticky-save-bar sheet-topbar">
      <div className="sheet-topbar-identity">
        {isOwner ? (
          <TextField
            className="sheet-topbar-name"
            value={name}
            onCommit={onNameChange}
            required
            maxLength={80}
            aria-label="Character name"
          />
        ) : (
          <h2 className="sheet-topbar-name">{name}</h2>
        )}
        <div className="sheet-topbar-meta">
          <span className="sheet-topbar-subtitle">{subtitle}</span>
          <span className="sheet-topbar-game">{gameName}</span>
          {isOwner && <CampaignSelector campaignId={campaignId} onChange={onCampaignChange} />}
          <HomebrewStatusChip status={homebrewStatus} />
        </div>
      </div>

      <div className="sheet-topbar-actions">
        {error && <span className="sheet-topbar-error" role="alert">{error}</span>}
        {!embedded && (
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/dashboard/characters')}>
            ← Back
          </button>
        )}
      </div>

      {isOwner && (
        // On phones this floats at the bottom of the screen, within thumb reach.
        <div className="sheet-dock" role="toolbar" aria-label="Edit history">
          {dockAction && (
            <button type="button" className="sheet-dock-btn sheet-dock-add" onClick={dockAction.run}>
              <span aria-hidden="true">+</span>{dockAction.label}
            </button>
          )}
          <button
            type="button"
            className="sheet-dock-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title={canUndo ? `Undo ${undoLabel} (Ctrl+Z)` : 'Nothing to undo'}
            aria-label={canUndo ? `Undo ${undoLabel}` : 'Undo'}
          >
            <span aria-hidden="true">↶</span><span className="sheet-dock-text">Undo</span>
          </button>
          <button
            type="button"
            className="sheet-dock-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title={canRedo ? `Redo ${redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'}
            aria-label={canRedo ? `Redo ${redoLabel}` : 'Redo'}
          >
            <span aria-hidden="true">↷</span><span className="sheet-dock-text">Redo</span>
          </button>
          <span className={`sheet-dock-status is-${status}`} role="status" aria-live="polite">
            <span className="sheet-dock-dot" aria-hidden="true" />
            {status === 'error' ? (
              <>
                {STATUS_TEXT.error}{' '}
                <button type="button" className="sheet-link" onClick={onRetry}>Retry</button>
              </>
            ) : (message && status !== 'pending' && status !== 'saving') ? message : STATUS_TEXT[status]}
          </span>
        </div>
      )}
    </div>
  );
};

export default CharacterTopBar;
