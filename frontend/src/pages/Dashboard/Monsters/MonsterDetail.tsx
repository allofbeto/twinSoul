import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getItem, updateItem, deleteItem } from '../../../api/backendHelpers';
import RichTextEditor from '../../../components/formComponents/RichTextEditor';
import AbilityScores from '../Characters/Components/AbilityScores';
import MonsterTopBar from './Components/MonsterTopBar';
import MonsterArtBox from './Components/MonsterArtBox';
import TraitListEditor, { TraitEntry } from './Components/TraitListEditor';
import VisibilityPanel from './Components/VisibilityPanel';
import ConfirmDialog from '../../../components/ConfirmDialog';
import '../../../styles/npc.css';

interface Monster {
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
  traits: TraitEntry[];
  actions: TraitEntry[];
  legendary_actions: TraitEntry[];
  visible_sections: string[];
}

const MonsterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Monster | null>(null);
  const [categoriesInput, setCategoriesInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = form?.user_id === user?.id;

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getItem(id!);
        setForm({
          traits: [],
          actions: [],
          legendary_actions: [],
          visible_sections: [],
          ...res.data,
        });
        setCategoriesInput((res.data.categories || []).join(', '));
      } catch {
        setError('Could not load monster.');
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

  const handleTraitsChange = (traits: TraitEntry[]) => {
    setForm({ ...form!, traits });
    markDirty();
  };

  const handleActionsChange = (actions: TraitEntry[]) => {
    setForm({ ...form!, actions });
    markDirty();
  };

  const handleLegendaryActionsChange = (legendary_actions: TraitEntry[]) => {
    setForm({ ...form!, legendary_actions });
    markDirty();
  };

  const handleVisibilityChange = (visible_sections: string[]) => {
    setForm({ ...form!, visible_sections });
    markDirty();
  };

  const saveMonster = async (overrides: Partial<Monster> = {}) => {
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
      traits: data.traits,
      actions: data.actions,
      legendary_actions: data.legendary_actions,
      visible_sections: data.visible_sections,
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
      await saveMonster();
      setSuccess('Monster updated!');
      setIsDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteItem(id!);
      navigate('/dashboard/monsters');
    } catch {
      setError('Could not delete monster.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">Monster not found.</p>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <MonsterTopBar
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
          onDelete={() => setShowDeleteConfirm(true)}
        />

        <div className="character-overview">
          <MonsterArtBox
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
                  placeholder="Beast, Undead, Boss"
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

        <div className="card-theme p-4 mb-4">
          <h5 className="text-theme mb-3">Stat Block</h5>
          <TraitListEditor
            title="Traits"
            entries={form.traits}
            onChange={handleTraitsChange}
            disabled={!isOwner}
          />
          <TraitListEditor
            title="Actions"
            entries={form.actions}
            onChange={handleActionsChange}
            disabled={!isOwner}
          />
          <TraitListEditor
            title="Legendary Actions"
            entries={form.legendary_actions}
            onChange={handleLegendaryActionsChange}
            disabled={!isOwner}
          />
        </div>

        {form.campaign_id && (
          <VisibilityPanel
            visibleSections={form.visible_sections}
            onChange={handleVisibilityChange}
            disabled={!isOwner}
          />
        )}
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Monster"
        message={<>Are you sure you want to delete <strong className="text-theme">{form.name}</strong>? This cannot be undone.</>}
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default MonsterDetail;
