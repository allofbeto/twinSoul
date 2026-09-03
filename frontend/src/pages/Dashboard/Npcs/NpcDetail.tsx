import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getItem, updateItem, deleteItem } from '../../../api/backendHelpers';
import RichTextEditor from '../../../components/formComponents/RichTextEditor';
import AbilityScores from '../Characters/Components/AbilityScores';
import NpcTopBar from './Components/NpcTopBar';
import NpcArtBox from './Components/NpcArtBox';
import '../../../styles/npc.css';

interface Npc {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  categories: string[];
  image_url: string | null;
  campaign_id: string | null;
  disposition: string;
  challenge_rating: string | null;
  armor_class: number;
  max_hp: number;
  current_hp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

const NpcDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Npc | null>(null);
  const [categoriesInput, setCategoriesInput] = useState('');

  const isOwner = form?.user_id === user?.id;

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getItem(id!);
        setForm(res.data);
        setCategoriesInput((res.data.categories || []).join(', '));
      } catch {
        setError('Could not load NPC.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const markDirty = () => setIsDirty(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form!, [e.target.name]: e.target.value });
    markDirty();
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form!, [e.target.name]: parseInt(e.target.value) || 0 });
    markDirty();
  };

  const handleImageUrlChange = (url: string) => {
    setForm({ ...form!, image_url: url });
    markDirty();
  };

  const handleNotesChange = (html: string) => {
    setForm({ ...form!, notes: html });
    markDirty();
  };

  const handleCategoriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoriesInput(e.target.value);
    markDirty();
  };

  const saveNpc = async (overrides: Partial<Npc> = {}) => {
    const data = { ...form!, ...overrides };
    await updateItem(id!, {
      name: data.name,
      notes: data.notes,
      categories: categoriesInput.split(',').map((c) => c.trim()).filter(Boolean),
      image_url: data.image_url,
      campaign_id: data.campaign_id,
      disposition: data.disposition,
      challenge_rating: data.challenge_rating,
      armor_class: data.armor_class,
      max_hp: data.max_hp,
      current_hp: data.current_hp,
      strength: data.strength,
      dexterity: data.dexterity,
      constitution: data.constitution,
      intelligence: data.intelligence,
      wisdom: data.wisdom,
      charisma: data.charisma,
    });
  };

  const handleCampaignChange = (newCampaignId: string | null) => {
    setForm({ ...form!, campaign_id: newCampaignId });
    markDirty();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveNpc();
      setSuccess('NPC updated!');
      setIsDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${form?.name}? This cannot be undone.`)) return;
    try {
      await deleteItem(id!);
      navigate('/dashboard/npcs');
    } catch {
      setError('Could not delete NPC.');
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">NPC not found.</p>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <NpcTopBar
          name={form.name}
          disposition={form.disposition}
          onDispositionChange={handleChange}
          isDirty={isDirty && isOwner}
          saving={saving}
          success={success}
          error={error}
          campaignId={form.campaign_id}
          onCampaignChange={handleCampaignChange}
          isOwner={isOwner}
          onDelete={handleDelete}
        />

        <div className="character-overview">
          <NpcArtBox
            imageUrl={form.image_url || undefined}
            challengeRating={form.challenge_rating || ''}
            currentHp={form.current_hp}
            armorClass={form.armor_class}
            onChallengeRatingChange={handleChange}
            handleNumberChange={handleNumberChange}
            onImageUrlChange={handleImageUrlChange}
            isOwner={isOwner}
          />

          <div className="card-theme p-4 mb-4 flex-grow-1">
            <h5 className="text-theme mb-3">Details</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label text-muted-theme">Max HP</label>
                <input
                  type="number"
                  name="max_hp"
                  className="form-control input-theme"
                  min={0}
                  value={form.max_hp}
                  onChange={handleNumberChange}
                  disabled={!isOwner}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label text-muted-theme">Tags</label>
                <input
                  type="text"
                  className="form-control input-theme"
                  value={categoriesInput}
                  onChange={handleCategoriesChange}
                  placeholder="Tavern keeper, Recurring"
                  disabled={!isOwner}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'stretch' }}>
          <AbilityScores
            form={form}
            handleNumberChange={handleNumberChange}
            isOwner={isOwner}
          />
          <div className="card-theme p-4 mb-4">
            <h5 className="text-theme mb-3">Notes</h5>
            <RichTextEditor
              content={form.notes || ''}
              onChange={handleNotesChange}
              readOnly={!isOwner}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default NpcDetail;
