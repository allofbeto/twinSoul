import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCharacter } from '../../../api/backendHelpers';

const DND_RACES = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'
];

const DND_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
  'Warlock', 'Wizard'
];

const DND_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
  'Deception', 'History', 'Insight', 'Intimidation',
  'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
  'Stealth', 'Survival'
];

const ABILITY_SCORES = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
];

const NewCharacter = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    race: '',
    level: 1,
    max_hp: 0,
    current_hp: 0,
    armor_class: 10,
    game: 'dnd_5e',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    classes: [] as string[],
    skills: [] as string[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: parseInt(e.target.value) || 0 });
  };

  const toggleClass = (cls: string) => {
    setForm({
      ...form,
      classes: form.classes.includes(cls)
        ? form.classes.filter((c) => c !== cls)
        : [...form.classes, cls],
    });
  };

  const toggleSkill = (skill: string) => {
    setForm({
      ...form,
      skills: form.skills.includes(skill)
        ? form.skills.filter((s) => s !== skill)
        : [...form.skills, skill],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createCharacter(form);
      navigate('/dashboard/characters');
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-theme mb-1">New Character</h2>
      <p className="text-muted-theme mb-4">Create a new D&D 5e character.</p>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>

        {/* Basic Info */}
        <div className="card-theme p-4 mb-4">
          <h5 className="text-theme mb-3">Basic Info</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label text-muted-theme">Name</label>
              <input
                type="text"
                name="name"
                className="form-control input-theme"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label text-muted-theme">Race</label>
              <select
                name="race"
                className="form-select input-theme"
                value={form.race}
                onChange={handleChange}
                required
              >
                <option value="">Select race</option>
                {DND_RACES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label text-muted-theme">Level</label>
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
        </div>

        {/* Classes */}
        <div className="card-theme p-4 mb-4">
          <h5 className="text-theme mb-3">Classes</h5>
          <div className="d-flex flex-wrap gap-2">
            {DND_CLASSES.map((cls) => (
              <button
                type="button"
                key={cls}
                className={`btn btn-sm ${form.classes.includes(cls) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => toggleClass(cls)}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Ability Scores */}
        <div className="card-theme p-4 mb-4">
          <h5 className="text-theme mb-3">Ability Scores</h5>
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
        </div>

        {/* Skills */}
        <div className="card-theme p-4 mb-4">
          <h5 className="text-theme mb-3">Skill Proficiencies</h5>
          <div className="d-flex flex-wrap gap-2">
            {DND_SKILLS.map((skill) => (
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

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-theme-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Character'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/dashboard/characters')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCharacter;