import React from 'react';
import { NumberField, OverridableNumber } from './sheet/fields';
import { ABILITY_KEYS, ABILITY_SHORT, AbilityKey, AbilityScoreSet, abilityMod, signed } from '../sheetRules';

export interface SaveRow {
  key: AbilityKey;
  proficient: boolean;
  /** What the class rules say, to tell a hand-set proficiency apart. */
  autoProficient: boolean;
  auto: number;
  value: number | undefined;
}

interface Props {
  scores: AbilityScoreSet;
  saves: SaveRow[];
  onScoreChange: (ability: AbilityKey, value: number) => void;
  onSaveProficiencyToggle: (ability: AbilityKey) => void;
  onSaveOverride: (ability: AbilityKey, value: number | null) => void;
  isOwner: boolean;
  showSaves: boolean;
}

// Each ability once: the modifier is what you roll with, so it's the big
// number; the score underneath is what you edit. Saving throws sit below:
// tap the dot to change proficiency, tap the number to set it by hand.
const AbilityScores = ({ scores, saves, onScoreChange, onSaveProficiencyToggle, onSaveOverride, isOwner, showSaves }: Props) => (
  <section className="sheet-card" aria-label="Ability scores">
    <h3 className="sheet-card-title">Abilities</h3>
    <div className="sheet-abilities">
      {ABILITY_KEYS.map((key) => (
        <div key={key} className="sheet-ability">
          <span className="sheet-ability-name">{ABILITY_SHORT[key]}</span>
          <span className="sheet-ability-mod">{signed(abilityMod(scores[key]))}</span>
          <NumberField
            className="sheet-ability-score"
            min={1}
            max={30}
            value={scores[key]}
            onCommit={(n) => onScoreChange(key, n)}
            disabled={!isOwner}
            aria-label={`${key} score`}
          />
        </div>
      ))}
    </div>

    {showSaves && (
      <>
        <h3 className="sheet-card-title mt-3">Saving Throws</h3>
        <ul className="sheet-list">
          {saves.map((s) => (
            <li key={s.key} className="sheet-list-row">
              <button
                type="button"
                className={`sheet-rank-btn ${s.proficient !== s.autoProficient ? 'is-custom' : ''}`}
                onClick={() => onSaveProficiencyToggle(s.key)}
                disabled={!isOwner}
                title={s.proficient !== s.autoProficient ? 'Proficiency set by hand' : (s.proficient ? 'Proficient' : 'Not proficient')}
                aria-label={`${ABILITY_SHORT[s.key]} save: ${s.proficient ? 'proficient' : 'not proficient'}`}
                aria-pressed={s.proficient}
              >
                <span className={`sheet-rank ${s.proficient ? 'is-proficient' : ''}`} />
              </button>
              <span className="sheet-list-name">{ABILITY_SHORT[s.key]}</span>
              <span className="sheet-list-bonus">
                <OverridableNumber
                  auto={s.auto}
                  value={s.value}
                  signed
                  editable={isOwner}
                  onChange={(v) => onSaveOverride(s.key, v)}
                  aria-label={`${ABILITY_SHORT[s.key]} saving throw bonus`}
                />
              </span>
            </li>
          ))}
        </ul>
      </>
    )}
  </section>
);

export default AbilityScores;
