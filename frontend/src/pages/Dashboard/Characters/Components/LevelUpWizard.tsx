import React, { useMemo, useState } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from 'reactstrap';
import { ABILITY_SCORES } from '../constants';

type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

interface AbilityScoresShape {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface LevelUpResult {
  hpGained: number;
  abilityChanges: Partial<Record<AbilityKey, number>>;
}

interface Props {
  isOpen: boolean;
  currentLevel: number;
  abilityScores: AbilityScoresShape;
  onCancel: () => void;
  onComplete: (result: LevelUpResult) => void;
}

const HIT_DICE = [6, 8, 10, 12];
const ASI_LEVELS = [4, 8, 12, 16, 19];

const getModifier = (score: number) => Math.floor((score - 10) / 2);

const LevelUpWizard = ({ isOpen, currentLevel, abilityScores, onCancel, onComplete }: Props) => {
  const newLevel = Math.min(20, currentLevel + 1);
  const isAsiLevel = ASI_LEVELS.includes(newLevel);

  const [step, setStep] = useState<'hp' | 'asi' | 'review'>('hp');
  const [hitDie, setHitDie] = useState(8);
  const [rollMethod, setRollMethod] = useState<'roll' | 'average'>('average');
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [asiChoice, setAsiChoice] = useState<'none' | 'single' | 'double'>('none');
  const [singleAbility, setSingleAbility] = useState<AbilityKey>('strength');
  const [doubleAbilities, setDoubleAbilities] = useState<AbilityKey[]>([]);

  const conMod = getModifier(abilityScores.constitution);
  const averageRoll = Math.floor(hitDie / 2) + 1;
  const baseRoll = rollMethod === 'roll' ? (rolledValue ?? averageRoll) : averageRoll;
  const hpGained = Math.max(1, baseRoll + conMod);

  const reroll = () => setRolledValue(Math.floor(Math.random() * hitDie) + 1);

  const abilityChanges: Partial<Record<AbilityKey, number>> = useMemo(() => {
    if (asiChoice === 'single') return { [singleAbility]: 2 };
    if (asiChoice === 'double') {
      const changes: Partial<Record<AbilityKey, number>> = {};
      doubleAbilities.forEach((k) => { changes[k] = (changes[k] || 0) + 1; });
      return changes;
    }
    return {};
  }, [asiChoice, singleAbility, doubleAbilities]);

  const toggleDoubleAbility = (key: AbilityKey) => {
    setDoubleAbilities((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const reset = () => {
    setStep('hp');
    setHitDie(8);
    setRollMethod('average');
    setRolledValue(null);
    setAsiChoice('none');
    setSingleAbility('strength');
    setDoubleAbilities([]);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleConfirm = () => {
    onComplete({ hpGained, abilityChanges });
    reset();
  };

  const goNextFromHp = () => setStep(isAsiLevel ? 'asi' : 'review');

  const abilityAfter = (key: AbilityKey) => Math.min(20, abilityScores[key] + (abilityChanges[key] || 0));

  return (
    <Modal isOpen={isOpen} toggle={handleCancel}>
      <ModalHeader toggle={handleCancel}>
        Level Up — {currentLevel} → {newLevel}
      </ModalHeader>
      <ModalBody>
        {step === 'hp' && (
          <div>
            <h6 className="text-theme mb-3">Hit Points</h6>
            <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
              Choose the hit die for the class you're leveling in.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {HIT_DICE.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn btn-sm ${hitDie === d ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                  onClick={() => { setHitDie(d); setRolledValue(null); }}
                >
                  d{d}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${rollMethod === 'average' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => setRollMethod('average')}
              >
                Take Average ({averageRoll})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${rollMethod === 'roll' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => { setRollMethod('roll'); if (rolledValue === null) reroll(); }}
              >
                Roll
              </button>
              {rollMethod === 'roll' && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={reroll}>
                  Reroll ({rolledValue ?? '—'})
                </button>
              )}
            </div>

            <p className="text-theme" style={{ fontSize: '0.9rem' }}>
              {baseRoll} (die) {conMod >= 0 ? '+' : ''}{conMod} (CON) = <strong>+{hpGained} HP</strong>
            </p>
          </div>
        )}

        {step === 'asi' && (
          <div>
            <h6 className="text-theme mb-3">Ability Score Improvement</h6>
            <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
              Level {newLevel} grants an Ability Score Improvement. Choose one:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${asiChoice === 'single' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => setAsiChoice('single')}
              >
                +2 to one ability
              </button>
              <button
                type="button"
                className={`btn btn-sm ${asiChoice === 'double' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => setAsiChoice('double')}
              >
                +1 to two abilities
              </button>
              <button
                type="button"
                className={`btn btn-sm ${asiChoice === 'none' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => setAsiChoice('none')}
              >
                Skip (taking a feat instead)
              </button>
            </div>

            {asiChoice === 'single' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {ABILITY_SCORES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-sm ${singleAbility === key ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setSingleAbility(key as AbilityKey)}
                    disabled={abilityScores[key as AbilityKey] >= 20}
                  >
                    {label} ({abilityScores[key as AbilityKey]} → {Math.min(20, abilityScores[key as AbilityKey] + 2)})
                  </button>
                ))}
              </div>
            )}

            {asiChoice === 'double' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {ABILITY_SCORES.map(({ key, label }) => {
                  const k = key as AbilityKey;
                  const selected = doubleAbilities.includes(k);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm ${selected ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleDoubleAbility(k)}
                      disabled={abilityScores[k] >= 20}
                    >
                      {label} ({abilityScores[k]} → {Math.min(20, abilityScores[k] + 1)})
                    </button>
                  );
                })}
              </div>
            )}
            {asiChoice === 'double' && doubleAbilities.length < 2 && (
              <p className="text-muted-theme mt-2" style={{ fontSize: '0.75rem' }}>
                Pick {2 - doubleAbilities.length} more.
              </p>
            )}
          </div>
        )}

        {step === 'review' && (
          <div>
            <h6 className="text-theme mb-3">Review</h6>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem' }} className="text-theme">
              <li>Level {currentLevel} → {newLevel}</li>
              <li>Max HP +{hpGained}</li>
              {Object.entries(abilityChanges).map(([key, delta]) => (
                <li key={key}>
                  {ABILITY_SCORES.find((a) => a.key === key)?.label}: {abilityScores[key as AbilityKey]} → {abilityAfter(key as AbilityKey)}
                </li>
              ))}
              {Object.keys(abilityChanges).length === 0 && isAsiLevel && (
                <li>Ability Score Improvement skipped (feat)</li>
              )}
            </ul>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step !== 'hp' && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setStep(step === 'review' ? (isAsiLevel ? 'asi' : 'hp') : 'hp')}
          >
            Back
          </button>
        )}
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCancel}>
          Cancel
        </button>
        {step === 'hp' && (
          <button type="button" className="btn btn-theme-primary btn-sm" onClick={goNextFromHp}>
            Next
          </button>
        )}
        {step === 'asi' && (
          <button
            type="button"
            className="btn btn-theme-primary btn-sm"
            onClick={() => setStep('review')}
            disabled={asiChoice === 'double' && doubleAbilities.length !== 2}
          >
            Next
          </button>
        )}
        {step === 'review' && (
          <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleConfirm}>
            Confirm Level Up
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default LevelUpWizard;
