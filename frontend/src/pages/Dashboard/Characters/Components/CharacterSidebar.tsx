import React from 'react';
import { DND_RACES } from '../constants';
import SearchBubbleInput from '../../../../components/formComponents/SearchBubbleInput';
import ClassManager from './ClassManager';
import { CharacterClassSummary } from '../classTypes';

interface Props {
  max_hp: number;
  gold: number;
  inspo: number;
  race: string;
  characterId: string;
  classSummaries: CharacterClassSummary[];
  legacyClasses: string[];
  supportsClasses: boolean;
  onCharacterUpdated: (updated: any) => void;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setFieldValue: (field: string, value: string) => void;
  isOwner: boolean;
}

const CharacterSidebar = ({ max_hp, inspo, gold, race, characterId, classSummaries, legacyClasses, supportsClasses, onCharacterUpdated, handleNumberChange, setFieldValue, isOwner }: Props) => {
  return (
    <div className="character-sidebar card-theme p-4">

      {/* Max HP */}
      <div className="character-sidebar-row">
        <span className="text-muted-theme">Max HP</span>
        <input
          type="number"
          name="max_hp"
          className="stat-input-inline"
          value={max_hp}
          onChange={handleNumberChange}
          min={0}
          disabled={!isOwner}
        />
      </div>
      <hr className="sidebar-divider" />

      {/* Inspiration */}
      <div className="character-sidebar-row">
        <span className="text-muted-theme">Inspiration</span>
        <input
          type="number"
          name="inspo"
          className="stat-input-inline"
          value={inspo}
          onChange={handleNumberChange}
          min={0}
          disabled={!isOwner}
        />
      </div>
      <hr className="sidebar-divider" />

      {/* Gold */}
      <div className="character-sidebar-row">
        <span className="text-muted-theme">Gold</span>
        <input
          type="number"
          name="gold"
          className="stat-input-inline"
          value={gold}
          onChange={handleNumberChange}
          min={0}
          disabled={!isOwner}
        />
      </div>
      <hr className="sidebar-divider" />

      {/* Race */}
      <div className="character-sidebar-col">
        <span className="text-muted-theme mb-2">Race</span>
        {isOwner ? (
          <SearchBubbleInput
            options={DND_RACES}
            selected={race ? [race] : []}
            onAdd={(val) => setFieldValue('race', val)}
            onRemove={() => setFieldValue('race', '')}
            placeholder="Search or create a race..."
            multiSelect={false}
            allowCreate={true}
          />
        ) : (
          <span className="text-theme">{race || '—'}</span>
        )}
      </div>
      <hr className="sidebar-divider" />

      {/* Classes */}
      <div className="character-sidebar-col">
        <span className="text-muted-theme mb-2">Classes</span>
        {supportsClasses ? (
          <ClassManager
            characterId={characterId}
            classSummaries={classSummaries}
            legacyClasses={legacyClasses}
            isOwner={isOwner}
            onCharacterUpdated={onCharacterUpdated}
          />
        ) : (
          <div className="d-flex flex-wrap gap-1 mt-1">
            {legacyClasses.length > 0 ? legacyClasses.map((cls) => (
              <span key={cls} className="badge-cls" style={{ fontSize: '0.8rem' }}>{cls}</span>
            )) : <span className="text-muted-theme">—</span>}
          </div>
        )}
      </div>

    </div>
  );
};

export default CharacterSidebar;