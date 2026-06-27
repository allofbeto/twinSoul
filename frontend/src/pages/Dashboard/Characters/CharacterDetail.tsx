import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCharacter, updateCharacter } from '../../../api/backendHelpers';
import CharacterTopBar from './Components/CharacterTopBar';
import ClassSelector from './Components/ClassSelector';
import AbilityScores from './Components/AbilityScores';
import SkillSelector from './Components/SkillSelector';
import CharacterArtBox from './Components/CharacterArtBox';
import CharacterSidebar from './Components/CharacterSidebar';


interface Character {
  id: string;
  name: string;
  race: string;
  classes: string[];
  level: number;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  game: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  skills: string[];
}

const CharacterDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Character | null>(null);

  const setFieldValue = (field: string, value: string) => {
    setForm({ ...form!, [field]: value });
    setIsDirty(true);
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCharacter(id!);
        setForm(res.data);
      } catch {
        setError('Could not load character.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form!, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form!, [e.target.name]: parseInt(e.target.value) || 0 });
    setIsDirty(true);
  };

  const toggleClass = (cls: string) => {
    setIsDirty(true);
    setForm({
      ...form!,
      classes: form!.classes.includes(cls)
        ? form!.classes.filter((c) => c !== cls)
        : [...form!.classes, cls],
    });
  };

  const toggleSkill = (skill: string) => {
    setIsDirty(true);
    setForm({
      ...form!,
      skills: form!.skills.includes(skill)
        ? form!.skills.filter((s) => s !== skill)
        : [...form!.skills, skill],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCharacter(id!, form!);
      setSuccess('Character updated!');
      setIsDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">Character not found.</p>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <CharacterTopBar
          name={form.name}
          race={form.race}
          level={form.level}
          isDirty={isDirty}
          saving={saving}
          success={success}
          error={error}
        />
  
        <div className="character-overview">
        <CharacterArtBox
          level={form.level}
          current_hp={form.current_hp}
          armor_class={form.armor_class}
          handleNumberChange={handleNumberChange}
        />
        <CharacterSidebar
          max_hp={form.max_hp}
          race={form.race}
          classes={form.classes}
          handleNumberChange={handleNumberChange}
          handleChange={handleChange}
          onToggleClass={toggleClass}
          setFieldValue={setFieldValue}
        />
        </div>
  
        <ClassSelector
          selected={form.classes}
          onToggle={toggleClass}
        />
        <AbilityScores
          form={form}
          handleNumberChange={handleNumberChange}
        />
        <SkillSelector
          selected={form.skills}
          onToggle={toggleSkill}
        />
      </form>
    </div>
  );
};

export default CharacterDetail;