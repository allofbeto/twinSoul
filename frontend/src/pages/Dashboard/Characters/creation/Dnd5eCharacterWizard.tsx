import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCharacter } from '../../../../api/backendHelpers';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { useCharRaces, findCharRace } from '../useCharRaces';
import { ABILITY_INDEX_TO_KEY, getClassAuraHue } from '../classTypes';
import { ABILITY_SCORES, DND_SKILLS } from '../constants';
import RaceIconPicker from '../Components/RaceIconPicker';
import CharacterAura from '../Components/CharacterAura';
import '../../../../styles/characterCreation.css';

type Step = 'basics' | 'class' | 'abilities' | 'skills' | 'review';

const STEPS: { key: Step; label: string }[] = [
  { key: 'basics', label: 'Name & Race' },
  { key: 'class', label: 'Class' },
  { key: 'abilities', label: 'Ability Scores' },
  { key: 'skills', label: 'Skills' },
  { key: 'review', label: 'Review' },
];

const getModifier = (score: number) => Math.floor((score - 10) / 2);

interface Props {
  onBack: () => void;
}

const Dnd5eCharacterWizard = ({ onBack }: Props) => {
  const navigate = useNavigate();
  const { classes: charClasses } = useCharClasses('dnd_5e');
  const { races: charRaces } = useCharRaces('dnd_5e');
  const [step, setStep] = useState<Step>('basics');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [charClassIndex, setCharClassIndex] = useState('');
  const [subclassIndex, setSubclassIndex] = useState('');
  const [raceIndex, setRaceIndex] = useState('');
  const [subraceIndex, setSubraceIndex] = useState('');
  const [hpTouched, setHpTouched] = useState(false);
  const [abilitiesTouched, setAbilitiesTouched] = useState(false);
  const [form, setForm] = useState({
    name: '',
    race: '',
    level: 1,
    max_hp: 0,
    current_hp: 0,
    armor_class: 10,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    skills: [] as string[],
  });

  const selectedClass = findCharClass(charClasses, charClassIndex || undefined);
  const showSubclassField = !!(selectedClass?.subclass_choice_level && form.level >= selectedClass.subclass_choice_level);
  const conMod = getModifier(form.constitution);
  const suggestedHp = selectedClass ? selectedClass.hit_die + conMod : null;
  const selectedSubclass = selectedClass?.subclasses.find((s) => s.index === subclassIndex);

  const selectedRace = findCharRace(charRaces, raceIndex || undefined);
  const selectedSubrace = selectedRace?.subraces.find((s) => s.index === subraceIndex);
  const raceBonuses = [
    ...(selectedRace?.ability_bonuses || []),
    ...(selectedSubrace?.ability_bonuses || []),
  ];

  const applyRaceBonuses = () => {
    if (raceBonuses.length === 0) return;
    const updated = { ...form };
    raceBonuses.forEach((b) => {
      const key = ABILITY_INDEX_TO_KEY[b.ability_score];
      if (key) (updated as any)[key] = Math.min(20, (updated as any)[key] + b.bonus);
    });
    setForm(updated);
    setAbilitiesTouched(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'max_hp' || e.target.name === 'current_hp') setHpTouched(true);
    setForm({ ...form, [e.target.name]: parseInt(e.target.value) || 0 });
  };

  const applySuggestedHp = () => {
    if (suggestedHp === null) return;
    const hp = Math.max(1, suggestedHp);
    setForm({ ...form, max_hp: hp, current_hp: hp });
    setHpTouched(true);
  };

  const toggleSkill = (skill: string) => {
    setForm({
      ...form,
      skills: form.skills.includes(skill)
        ? form.skills.filter((s) => s !== skill)
        : [...form.skills, skill],
    });
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const canLeaveBasics = form.name.trim().length > 0 && form.race.trim().length > 0;

  const goNext = () => {
    if (step === 'basics' && !canLeaveBasics) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  };
  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
    else onBack();
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      await createCharacter({
        ...form,
        game: 'dnd_5e',
        char_class_index: charClassIndex || undefined,
        subclass_index: subclassIndex || undefined,
      });
      navigate('/dashboard/characters');
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const railValue = (key: Step): string => {
    switch (key) {
      case 'basics':
        return form.name.trim() ? `${form.name}${form.race ? ` · ${form.race}` : ''}` : 'Not started';
      case 'class':
        return selectedClass ? `${selectedClass.name}${selectedSubclass ? ` — ${selectedSubclass.name}` : ''}` : 'None yet';
      case 'abilities':
        return hpTouched ? `HP ${form.current_hp}/${form.max_hp}` : 'Not set';
      case 'skills':
        return form.skills.length > 0 ? `${form.skills.length} selected` : 'None selected';
      case 'review':
        return '';
      default:
        return '';
    }
  };

  const railCompleted = (key: Step): boolean => {
    switch (key) {
      case 'basics': return canLeaveBasics;
      case 'class': return !!selectedClass;
      case 'abilities': return hpTouched;
      case 'skills': return form.skills.length > 0;
      default: return false;
    }
  };

  return (
    <div>
      <h2 className="text-theme mb-3">New D&D 5e Character</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="creation-layout">
        {/* Left rail: step checklist */}
        <div className="creation-rail">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`creation-rail-step ${step === s.key ? 'active' : ''} ${railCompleted(s.key) ? 'completed' : ''}`}
              onClick={() => setStep(s.key)}
            >
              <span className="creation-rail-step-marker">{railCompleted(s.key) ? '✓' : i + 1}</span>
              <span>
                <div className="creation-rail-step-label">{s.label}</div>
                {railValue(s.key) && <div className="creation-rail-step-value">{railValue(s.key)}</div>}
              </span>
            </button>
          ))}
        </div>

        {/* Center: active step */}
        <div>
          {step === 'basics' && (
            <div className="card-theme p-4 mb-4">
              <h5 className="text-theme mb-3">Name & Race</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-muted-theme">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control input-theme"
                    value={form.name}
                    onChange={handleChange}
                    autoFocus
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label text-muted-theme">Starting Level</label>
                  <input
                    type="number"
                    name="level"
                    className="form-control input-theme"
                    min={1}
                    max={20}
                    value={form.level}
                    onChange={handleNumberChange}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label text-muted-theme">Armor Class</label>
                  <input
                    type="number"
                    name="armor_class"
                    className="form-control input-theme"
                    min={0}
                    value={form.armor_class}
                    onChange={handleNumberChange}
                  />
                </div>
              </div>

              <label className="form-label text-muted-theme mt-3">Race</label>
              <RaceIconPicker
                selectedRaceIndex={raceIndex || null}
                selectedSubraceIndex={subraceIndex || null}
                onSelect={({ raceIndex: idx, raceName, subraceIndex: subIdx, subraceName }) => {
                  setRaceIndex(idx);
                  setSubraceIndex(subIdx || '');
                  setAbilitiesTouched(false);
                  setForm({ ...form, race: subraceName ? `${raceName} (${subraceName})` : raceName });
                }}
              />
            </div>
          )}

          {step === 'class' && (
            <div className="card-theme p-4 mb-4">
              <h5 className="text-theme mb-3">Class</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <select
                    className="form-select input-theme"
                    value={charClassIndex}
                    onChange={(e) => { setCharClassIndex(e.target.value); setSubclassIndex(''); }}
                  >
                    <option value="">Select class (optional)</option>
                    {charClasses.map((c) => (
                      <option key={c.index} value={c.index}>{c.name} (d{c.hit_die})</option>
                    ))}
                  </select>
                </div>
                {showSubclassField && selectedClass && (
                  <div className="col-md-6">
                    <select
                      className="form-select input-theme"
                      value={subclassIndex}
                      onChange={(e) => setSubclassIndex(e.target.value)}
                    >
                      <option value="">Select subclass (optional)</option>
                      {selectedClass.subclasses.map((sc) => (
                        <option key={sc.index} value={sc.index}>{sc.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedClass && (
                <div className="mt-3" style={{ fontSize: '0.85rem' }}>
                  <p className="text-muted-theme mb-1">
                    Hit Die d{selectedClass.hit_die}
                    {selectedClass.saving_throws.length > 0 && (
                      <> · Saving Throws: {selectedClass.saving_throws.map((a) => a.toUpperCase()).join(', ')}</>
                    )}
                    {selectedClass.spellcasting_ability && <> · Spellcasting: {selectedClass.spellcasting_ability.toUpperCase()}</>}
                  </p>
                  {!showSubclassField && selectedClass.subclass_choice_level && (
                    <p className="text-muted-theme mb-0">
                      {selectedClass.name} chooses a subclass at level {selectedClass.subclass_choice_level}.
                    </p>
                  )}
                </div>
              )}

              <p className="text-muted-theme mt-3 mb-0" style={{ fontSize: '0.8rem' }}>
                Multiclassing is added later through the Level Up flow on the character sheet.
              </p>
            </div>
          )}

          {step === 'abilities' && (
            <div className="card-theme p-4 mb-4">
              <h5 className="text-theme mb-3">Ability Scores</h5>
              {raceBonuses.length > 0 && !abilitiesTouched && (
                <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={applyRaceBonuses}>
                  Apply {form.race} bonuses ({raceBonuses.map((b) => `${b.ability_score.toUpperCase()} +${b.bonus}`).join(', ')})
                </button>
              )}
              <div className="row g-3">
                {ABILITY_SCORES.map(({ key, label }) => (
                  <div className="col-4 col-md-2" key={key}>
                    <label className="form-label text-muted-theme text-center d-block">{label}</label>
                    <input
                      type="number"
                      name={key}
                      className="form-control input-theme text-center"
                      min={1}
                      max={30}
                      value={(form as any)[key]}
                      onChange={handleNumberChange}
                    />
                  </div>
                ))}
              </div>

              <hr className="sidebar-divider" />

              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label text-muted-theme">Max HP</label>
                  <input
                    type="number"
                    name="max_hp"
                    className="form-control input-theme"
                    min={0}
                    value={form.max_hp}
                    onChange={handleNumberChange}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted-theme">Current HP</label>
                  <input
                    type="number"
                    name="current_hp"
                    className="form-control input-theme"
                    min={0}
                    value={form.current_hp}
                    onChange={handleNumberChange}
                  />
                </div>
                {suggestedHp !== null && !hpTouched && (
                  <div className="col-md-4">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={applySuggestedHp}>
                      Use {selectedClass?.name} level 1 HP ({Math.max(1, suggestedHp)})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'skills' && (
            <div className="card-theme p-4 mb-4">
              <h5 className="text-theme mb-3">Skill Proficiencies</h5>
              <div className="d-flex flex-wrap gap-2">
                {DND_SKILLS.map(({ name: skill }) => (
                  <button
                    type="button"
                    key={skill}
                    className={`btn btn-sm ${form.skills.includes(skill) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="card-theme p-4 mb-4">
              <h5 className="text-theme mb-3">Review</h5>
              <ul style={{ paddingLeft: '1.1rem' }} className="text-theme">
                <li>{form.name} — {form.race}, Level {form.level}</li>
                <li>
                  Class: {selectedClass ? `${selectedClass.name} (d${selectedClass.hit_die})` : 'None yet'}
                  {selectedSubclass ? ` — ${selectedSubclass.name}` : ''}
                </li>
                <li>HP: {form.current_hp} / {form.max_hp} · AC: {form.armor_class}</li>
                <li>
                  {ABILITY_SCORES.map(({ key, label }) => `${label} ${(form as any)[key]}`).join(' · ')}
                </li>
                <li>Skills: {form.skills.length > 0 ? form.skills.join(', ') : 'None selected'}</li>
              </ul>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={goBack}>
              {step === 'basics' ? 'Change Game' : 'Back'}
            </button>
            {step !== 'review' ? (
              <button
                type="button"
                className="btn btn-theme-primary"
                onClick={goNext}
                disabled={step === 'basics' && !canLeaveBasics}
              >
                Next
              </button>
            ) : (
              <button type="button" className="btn btn-theme-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Character'}
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="creation-preview card-theme p-3">
          <CharacterAura hue={getClassAuraHue(charClassIndex || null)} />
          <h5 className="text-theme text-center mt-3 mb-0">{form.name || 'Unnamed'}</h5>
          <p className="text-muted-theme text-center mb-0" style={{ fontSize: '0.8rem' }}>
            {form.race || 'No race'} {selectedClass ? `· ${selectedClass.name} 1` : ''}
          </p>

          <div className="creation-preview-stats">
            {ABILITY_SCORES.map(({ key, label }) => {
              const score = (form as any)[key];
              const mod = getModifier(score);
              return (
                <div className="creation-preview-stat" key={key}>
                  <div className="creation-preview-stat-label">{label}</div>
                  <div className="creation-preview-stat-value">{score}</div>
                  <div className="creation-preview-stat-label">{mod >= 0 ? `+${mod}` : mod}</div>
                </div>
              );
            })}
          </div>

          <hr className="sidebar-divider" />
          <p className="text-muted-theme mb-1" style={{ fontSize: '0.8rem' }}>
            HP {form.current_hp}/{form.max_hp} · AC {form.armor_class}
          </p>
          {selectedClass && (
            <p className="text-muted-theme mb-0" style={{ fontSize: '0.8rem' }}>
              Hit Die d{selectedClass.hit_die}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dnd5eCharacterWizard;
