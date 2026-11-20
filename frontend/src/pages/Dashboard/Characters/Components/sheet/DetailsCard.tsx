import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import ClassManager from '../ClassManager';
import RaceIconPicker from '../RaceIconPicker';
import RaceIcon from '../RaceIcon';
import { CharacterClassSummary } from '../../classTypes';
import { raceLabel } from '../../raceTypes';
import { NumberField, TextField } from './fields';
import { BACKGROUNDS } from '../../creation/backgrounds';
import { AbilityScoreSet } from '../../sheetRules';

export interface RaceChoice {
  name: string;
  char_race_index: string;
  subrace_index: string | null;
}

interface Props {
  race: string;
  raceIndex: string | null;
  /** Which drawn icon to show (homebrew races borrow one). */
  raceIconKey: string | null;
  subraceIndex: string | null;
  background?: string | null;
  level: number;
  gold: number;
  characterId: string;
  classSummaries: CharacterClassSummary[];
  legacyClasses: string[];
  is5e: boolean;
  isOwner: boolean;
  scores: AbilityScoreSet;
  onCharacterUpdated: (updated: any) => void;
  onRaceChange: (race: RaceChoice) => void;
  onLevelChange: (level: number) => void;
  onGoldChange: (gold: number) => void;
  onBackgroundChange: (background: string) => void;
}

// Who the character is: race, classes, background, plus the purse.
const DetailsCard = ({
  race, raceIndex, raceIconKey, subraceIndex, background, level, gold,
  characterId, classSummaries, legacyClasses, is5e, isOwner, scores,
  onCharacterUpdated, onRaceChange, onLevelChange, onGoldChange, onBackgroundChange,
}: Props) => {
  const [pickingRace, setPickingRace] = useState(false);
  const [draft, setDraft] = useState<RaceChoice | null>(null);
  // Level comes from the classes once there are any.
  const levelFromClasses = is5e && classSummaries.length > 0;

  const openPicker = () => {
    setDraft(raceIndex ? { name: race, char_race_index: raceIndex, subrace_index: subraceIndex } : null);
    setPickingRace(true);
  };

  return (
    <section className="sheet-card sheet-details" aria-label="Character details">
      <div className="sheet-detail">
        <span className="sheet-label">Race</span>
        <div className="sheet-detail-race">
          {raceIconKey && <RaceIcon index={raceIconKey} size="1.6rem" />}
          <span className="sheet-detail-value">{race || '—'}</span>
          {isOwner && is5e && (
            <button type="button" className="sheet-link" onClick={openPicker}>Change</button>
          )}
        </div>
        {is5e && !raceIndex && race && isOwner && (
          <span className="sheet-detail-note">Not linked to a race yet: pick it to get its speed and traits.</span>
        )}
      </div>

      <div className="sheet-detail">
        <span className="sheet-label">Classes</span>
        {is5e ? (
          <ClassManager
            characterId={characterId}
            classSummaries={classSummaries}
            legacyClasses={legacyClasses}
            isOwner={isOwner}
            scores={scores}
            onCharacterUpdated={onCharacterUpdated}
          />
        ) : (
          <div className="d-flex flex-wrap gap-1">
            {legacyClasses.length ? legacyClasses.map((c) => <span key={c} className="badge-cls">{c}</span>) : <span className="text-muted-theme">—</span>}
          </div>
        )}
      </div>

      <div className="sheet-detail-grid">
        <div className="sheet-detail">
          <span className="sheet-label">Level</span>
          {levelFromClasses || !isOwner ? (
            <span className="sheet-detail-value" title={levelFromClasses ? 'Total of your class levels: edit them above' : undefined}>{level}</span>
          ) : (
            <NumberField
              className="sheet-inline-input"
              min={1}
              max={20}
              value={level}
              onCommit={onLevelChange}
              aria-label="Level"
            />
          )}
        </div>

        <div className="sheet-detail">
          <span className="sheet-label">Gold</span>
          <NumberField
            className="sheet-inline-input"
            min={0}
            value={gold}
            onCommit={onGoldChange}
            disabled={!isOwner}
            aria-label="Gold"
          />
        </div>

        {(background || isOwner) && (
          <div className="sheet-detail sheet-detail--wide">
            <span className="sheet-label">Background</span>
            {isOwner ? (
              <>
              <TextField
                value={background || ''}
                onCommit={onBackgroundChange}
                placeholder="Pick or type a background"
                maxLength={60}
                list="sheet-background-options"
                aria-label="Background"
              />
              <datalist id="sheet-background-options">
                {BACKGROUNDS.map((b) => <option key={b.index} value={b.name} />)}
              </datalist>
              </>
            ) : (
              <span className="sheet-detail-value">{background}</span>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={pickingRace} toggle={() => setPickingRace(false)} size="xl" scrollable fullscreen="sm" contentClassName="theme-modal">
        <ModalHeader toggle={() => setPickingRace(false)}>Change race</ModalHeader>
        <ModalBody>
          <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
            Changing race doesn't touch your ability scores: adjust them yourself if the racial bonuses differ.
          </p>
          <RaceIconPicker
            selectedRaceIndex={draft?.char_race_index || null}
            selectedSubraceIndex={draft?.subrace_index || null}
            onSelect={({ raceIndex: idx, raceName, subraceIndex: subIdx, subraceName }) =>
              setDraft({ name: raceLabel(raceName, subraceName), char_race_index: idx, subrace_index: subIdx || null })}
          />
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setPickingRace(false)}>Cancel</button>
          <button
            type="button"
            className="btn btn-theme-primary"
            disabled={!draft}
            onClick={() => { if (draft) onRaceChange(draft); setPickingRace(false); }}
          >
            Use {draft?.name || 'race'}
          </button>
        </ModalFooter>
      </Modal>
    </section>
  );
};

export default DetailsCard;
