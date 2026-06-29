import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
} from 'reactstrap';
import { useAuth } from '../../../context/AuthContext';
import { useParams } from 'react-router-dom';
import { getCharacter, updateCharacter, createImageAsset, migrateInventory, getInventoryItems } from '../../../api/backendHelpers';
import CharacterTopBar from './Components/CharacterTopBar';
import AbilityScores from './Components/AbilityScores';
import CharacterArtBox from './Components/CharacterArtBox';
import CharacterSidebar from './Components/CharacterSidebar';
import TabbedPanel from './Components/TabbedPanel';
import MigrateInventory from '../../Items/MigrateItems';

interface Character {
  id: string;
  user_id: string;
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
  profile_image_id: string;
  gold: number;
  inspo: number;
  campaign_id: string | null;
  campaign?: { id: string; name: string };
}

const CharacterDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Character | null>(null);

  const [pendingCampaignId, setPendingCampaignId]:any = useState("");

  const [showModal, setShowModal]:any = useState(false);
  const toggleModal = () => {
    setShowModal(!showModal)
  }
  const [modalFunction, setModalFunction] = useState<string | null>(null);
  const modalSwitch = (fn: string | null) => {
    switch (modalFunction) {
      case 'migrate_inventory':
        return {
          title: 'Existing Inventory Detected',
          body: (
            <MigrateInventory
              onMigrate={async () => {
                await migrateInventory(form!.id, 'migrate');
                const updated = { ...form!, campaign_id: pendingCampaignId };
                setForm(updated);
                await saveCharacter({ campaign_id: pendingCampaignId });
                setSuccess('Campaign updated!');
                setIsDirty(false);
                toggleModal();
              }}
              onClear={async () => {
                await migrateInventory(form!.id, 'clear');
                const updated = { ...form!, campaign_id: pendingCampaignId };
                setForm(updated);
                await saveCharacter({ campaign_id: pendingCampaignId });
                setSuccess('Campaign updated!');
                setIsDirty(false);
                toggleModal();
              }}
              onCancel={() => {
                toggleModal();
              }}
            />
          ),
        };
      default:
        return null;
    }
  };

  const { user } = useAuth();
  const isOwner = form?.user_id === user?.id;

  const saveCharacter = async (overrides: Partial<Character> = {}) => {
    const data = { ...form!, ...overrides };
    await updateCharacter(id!, {
      name: data.name,
      race: data.race,
      level: data.level,
      max_hp: data.max_hp,
      current_hp: data.current_hp,
      armor_class: data.armor_class,
      game: data.game,
      strength: data.strength,
      dexterity: data.dexterity,
      constitution: data.constitution,
      intelligence: data.intelligence,
      wisdom: data.wisdom,
      charisma: data.charisma,
      classes: data.classes,
      skills: data.skills,
      profile_image_id: data.profile_image_id,
      gold: data.gold,
      inspo: data.inspo,
      campaign_id: data.campaign_id,
    });
  };

  const [imageUrl, setImageUrl] = useState<string>(form?.profile_image_id || '');
  const handleImageUrlChange = async (url: string) => {
    try {
      const res = await createImageAsset({ url });
      console.log('image asset response:', res.data);
      setForm({ ...form!, profile_image_id: res.data.id });
      setImageUrl(url);
      setIsDirty(true);
    } catch (err) {
      console.log('error:', err);
    }
  };

  const setFieldValue = (field: string, value: string) => {
    setForm({ ...form!, [field]: value });
    setIsDirty(true);
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCharacter(id!);
        setForm(res.data);
        if (res.data.profile_image?.url) {
          setImageUrl(res.data.profile_image.url);
        }
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

  const addClass = (cls: string) => {
    setIsDirty(true);
    setForm({
      ...form!,
      classes: [...form!.classes, cls],
    });
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

  const handleCampaignChange = async (newCampaignId: string | null) => {
    try {
      const res = await getInventoryItems(form!.id);
      if (res.data.length > 0 && newCampaignId) {
        setPendingCampaignId(newCampaignId);
        setModalFunction('migrate_inventory');
        setShowModal(true);
      } else {
        setForm({ ...form!, campaign_id: newCampaignId });
        setIsDirty(true);
      }
    } catch {
      setForm({ ...form!, campaign_id: newCampaignId });
      setIsDirty(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveCharacter();
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
          isDirty={isDirty && isOwner}
          saving={saving}
          success={success}
          error={error}
          campaignId={form.campaign_id}
          onCampaignChange={handleCampaignChange}
        />
  
        <div className="character-overview">
          <CharacterArtBox
            imageUrl={imageUrl}
            level={form.level}
            current_hp={form.current_hp}
            armor_class={form.armor_class}
            handleNumberChange={handleNumberChange}
            onImageUrlChange={handleImageUrlChange}
            isOwner={isOwner}
          />
          <CharacterSidebar
            max_hp={form.max_hp}
            gold={form.gold}
            inspo={form.inspo}
            race={form.race}
            classes={form.classes}
            handleNumberChange={handleNumberChange}
            handleChange={handleChange}
            onToggleClass={toggleClass}
            onAddClass={addClass}
            setFieldValue={setFieldValue}
            isOwner={isOwner}
          />
        </div>
  
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'stretch' }}>
          <AbilityScores
            form={form}
            handleNumberChange={handleNumberChange}
            isOwner={isOwner}

          />
          <TabbedPanel
            skills={form.skills}
            onToggleSkill={toggleSkill}
            abilityScores={{
              strength: form.strength,
              dexterity: form.dexterity,
              constitution: form.constitution,
              intelligence: form.intelligence,
              wisdom: form.wisdom,
              charisma: form.charisma,
            }}
            proficiencyBonus={Math.ceil(form.level / 4) + 1}
            characterId={form.id}
            isOwner={isOwner}
          />
        </div>
      </form>

      <Modal isOpen={showModal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>
          {modalSwitch(modalFunction)?.title}
        </ModalHeader>
        <ModalBody>
          {modalSwitch(modalFunction)?.body}
        </ModalBody>
      </Modal>
    </div>
  );
};

export default CharacterDetail;