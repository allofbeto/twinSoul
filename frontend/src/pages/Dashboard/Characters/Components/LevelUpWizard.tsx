import React, { useMemo, useState } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from 'reactstrap';
import { ABILITY_SCORES } from '../constants';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { CharacterClassSummary, getFeaturesGainedAt, requiresSubclassChoiceAt, spellSlotsAt } from '../classTypes';
import { levelUpCharacter } from '../../../../api/backendHelpers';

type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

interface AbilityScoresShape {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface Props {
  isOpen: boolean;
  characterId: string;
  currentLevel: number;
  classSummaries: CharacterClassSummary[];
  abilityScores: AbilityScoresShape;
  onCancel: () => void;
  onComplete: (updatedCharacter: any) => void;
}

const getModifier = (score: number) => Math.floor((score - 10) / 2);

const SLOT_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const LevelUpWizard = ({ isOpen, characterId, currentLevel, classSummaries, abilityScores, onCancel, onComplete }: Props) => {
  const { classes } = useCharClasses();

  type Step = 'choose-class' | 'hp' | 'subclass' | 'asi' | 'review';
  const [step, setStep] = useState<Step>('choose-class');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedClassIndex, setSelectedClassIndex] = useState<string | null>(null);
  const [rollMethod, setRollMethod] = useState<'roll' | 'average'>('average');
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [subclassIndex, setSubclassIndex] = useState<string | null>(null);
  const [asiChoice, setAsiChoice] = useState<'none' | 'single' | 'double'>('none');
  const [singleAbility, setSingleAbility] = useState<AbilityKey>('strength');
  const [doubleAbilities, setDoubleAbilities] = useState<AbilityKey[]>([]);

  const takenIndexes = classSummaries.filter((s) => s.char_class_index).map((s) => s.char_class_index as string);
  const existingSummary = classSummaries.find((s) => s.char_class_index === selectedClassIndex);
  const selectedClass = findCharClass(classes, selectedClassIndex || undefined);
  const oldClassLevel = existingSummary?.level || 0;
  const newClassLevel = oldClassLevel + 1;
  const newTotalLevel = Math.min(20, currentLevel + 1);

  const hitDie = selectedClass?.hit_die || 8;
  const conMod = getModifier(abilityScores.constitution);
  const averageRoll = Math.floor(hitDie / 2) + 1;
  const baseRoll = rollMethod === 'roll' ? (rolledValue ?? averageRoll) : averageRoll;
  const hpGained = Math.max(1, baseRoll + conMod);

  const reroll = () => setRolledValue(Math.floor(Math.random() * hitDie) + 1);

  const needsSubclassChoice = selectedClass
    ? requiresSubclassChoiceAt(selectedClass, newClassLevel) && !existingSummary?.subclass_index
    : false;
  const alreadyChosenSubclass = existingSummary?.subclass_index || null;
  const effectiveSubclassIndex = subclassIndex || alreadyChosenSubclass;

  const levelData = selectedClass?.levels.find((l) => l.level === newClassLevel);
  const isAsiLevel = !!levelData && levelData.ability_score_bonuses > 0;

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
    setStep('choose-class');
    setSelectedClassIndex(null);
    setRollMethod('average');
    setRolledValue(null);
    setSubclassIndex(null);
    setAsiChoice('none');
    setSingleAbility('strength');
    setDoubleAbilities([]);
    setError('');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const abilityAfter = (key: AbilityKey) => Math.min(20, abilityScores[key] + (abilityChanges[key] || 0));

  const grantedFeatures = selectedClass ? getFeaturesGainedAt(selectedClass, newClassLevel, effectiveSubclassIndex) : [];
  const oldSlots = selectedClass ? spellSlotsAt(selectedClass, oldClassLevel) : null;
  const newSlots = selectedClass ? spellSlotsAt(selectedClass, newClassLevel) : null;

  const selectClass = (index: string) => {
    setSelectedClassIndex(index);
    setStep('hp');
  };

  const goNextFromHp = () => {
    if (needsSubclassChoice) return setStep('subclass');
    setStep(isAsiLevel ? 'asi' : 'review');
  };

  const goNextFromSubclass = () => setStep(isAsiLevel ? 'asi' : 'review');

  const handleConfirm = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await levelUpCharacter(characterId, {
        char_class_index: selectedClass.index,
        hp_gained: hpGained,
        subclass_index: subclassIndex || undefined,
        ability_score_changes: abilityChanges,
      });
      onComplete(res.data);
      reset();
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Could not level up.');
    } finally {
      setSubmitting(false);
    }
  };

  const untaken = classes.filter((c) => !takenIndexes.includes(c.index));
  const takenClasses = classSummaries.filter((s) => s.char_class_index);

  return (
    <Modal isOpen={isOpen} toggle={handleCancel}>
      <ModalHeader toggle={handleCancel}>
        Level Up — {currentLevel} → {newTotalLevel}
      </ModalHeader>
      <ModalBody>
        {error && <div className="alert alert-danger">{error}</div>}

        {step === 'choose-class' && (
          <div>
            <h6 className="text-theme mb-3">Which class gains a level?</h6>
            {takenClasses.length > 0 && (
              <div className="d-flex flex-column gap-2 mb-3">
                {takenClasses.map((s) => {
                  const cls = findCharClass(classes, s.char_class_index);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="btn btn-outline-secondary btn-sm text-start"
                      onClick={() => selectClass(s.char_class_index as string)}
                    >
                      {cls?.name || s.char_class_name} — currently level {s.level}
                      {s.subclass_index && cls ? ` (${cls.subclasses.find((sc) => sc.index === s.subclass_index)?.name})` : ''}
                    </button>
                  );
                })}
              </div>
            )}
            {untaken.length > 0 && (
              <>
                <p className="text-muted-theme mb-2" style={{ fontSize: '0.85rem' }}>
                  {takenClasses.length > 0 ? 'Or multiclass into a new class:' : 'Choose a class:'}
                </p>
                <div className="d-flex flex-wrap gap-2">
                  {untaken.map((c) => (
                    <button
                      key={c.index}
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => selectClass(c.index)}
                    >
                      {c.name} (d{c.hit_die})
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === 'hp' && selectedClass && (
          <div>
            <h6 className="text-theme mb-3">
              {selectedClass.name} — Hit Points (Level {oldClassLevel} → {newClassLevel})
            </h6>
            <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
              Hit die: d{hitDie}
            </p>
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

        {step === 'subclass' && selectedClass && (
          <div>
            <h6 className="text-theme mb-3">Choose a {selectedClass.name} Subclass</h6>
            <div className="d-flex flex-column gap-2">
              {selectedClass.subclasses.map((sc) => (
                <button
                  key={sc.index}
                  type="button"
                  className={`btn btn-sm text-start ${subclassIndex === sc.index ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSubclassIndex(sc.index)}
                >
                  <strong>{sc.name}</strong>
                  {sc.desc[0] && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.15rem' }}>
                      {sc.desc[0].slice(0, 140)}{sc.desc[0].length > 140 ? '…' : ''}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'asi' && (
          <div>
            <h6 className="text-theme mb-3">Ability Score Improvement</h6>
            <p className="text-muted-theme" style={{ fontSize: '0.85rem' }}>
              Level {newClassLevel} in {selectedClass?.name} grants an Ability Score Improvement. Choose one:
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

        {step === 'review' && selectedClass && (
          <div>
            <h6 className="text-theme mb-3">Review</h6>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem' }} className="text-theme">
              <li>{selectedClass.name}: {oldClassLevel} → {newClassLevel} (Character level {currentLevel} → {newTotalLevel})</li>
              <li>Max HP +{hpGained}</li>
              {effectiveSubclassIndex && (
                <li>Subclass: {selectedClass.subclasses.find((s) => s.index === effectiveSubclassIndex)?.name}</li>
              )}
              {Object.entries(abilityChanges).map(([key, delta]) => (
                <li key={key}>
                  {ABILITY_SCORES.find((a) => a.key === key)?.label}: {abilityScores[key as AbilityKey]} → {abilityAfter(key as AbilityKey)}
                </li>
              ))}
              {Object.keys(abilityChanges).length === 0 && isAsiLevel && (
                <li>Ability Score Improvement skipped (feat)</li>
              )}
            </ul>

            {grantedFeatures.length > 0 && (
              <>
                <h6 className="text-theme mt-3 mb-2">Features Gained</h6>
                <div className="d-flex flex-column gap-2">
                  {grantedFeatures.map((f) => (
                    <div key={f.index}>
                      <strong className="text-theme" style={{ fontSize: '0.85rem' }}>{f.name}</strong>
                      {f.desc[0] && (
                        <p className="text-muted-theme mb-0" style={{ fontSize: '0.78rem' }}>
                          {f.desc[0].slice(0, 220)}{f.desc[0].length > 220 ? '…' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {newSlots && (
              <>
                <h6 className="text-theme mt-3 mb-2">Spell Slots</h6>
                <div className="d-flex flex-wrap gap-2" style={{ fontSize: '0.8rem' }}>
                  {SLOT_LABELS.map((lvl) => {
                    const key = `spell_slots_level_${lvl}`;
                    const val = newSlots[key] || 0;
                    const oldVal = oldSlots?.[key] || 0;
                    if (val === 0) return null;
                    return (
                      <span key={lvl} className="badge-cls">
                        Lvl {lvl}: {val}{val !== oldVal ? ` (was ${oldVal})` : ''}
                      </span>
                    );
                  })}
                  {typeof newSlots.cantrips_known === 'number' && (
                    <span className="badge-cls">Cantrips: {newSlots.cantrips_known}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step !== 'choose-class' && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              if (step === 'hp') setStep('choose-class');
              else if (step === 'subclass') setStep('hp');
              else if (step === 'asi') setStep(needsSubclassChoice ? 'subclass' : 'hp');
              else if (step === 'review') setStep(isAsiLevel ? 'asi' : (needsSubclassChoice ? 'subclass' : 'hp'));
            }}
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
        {step === 'subclass' && (
          <button
            type="button"
            className="btn btn-theme-primary btn-sm"
            onClick={goNextFromSubclass}
            disabled={!subclassIndex}
          >
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
          <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Saving...' : 'Confirm Level Up'}
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default LevelUpWizard;
