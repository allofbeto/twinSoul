import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaignItems } from '../../../api/backendHelpers';
import { TraitEntry } from './Components/TraitListEditor';
import '../../../styles/statBlock.css';

interface RedactedMonster {
  id: string;
  name: string;
  image_url: string | null;
  categories: string[];
  notes: string | null;
  visible_sections: string[];
  armor_class?: number;
  max_hp?: number;
  current_hp?: number;
  challenge_rating?: string | null;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  traits?: TraitEntry[];
  actions?: TraitEntry[];
  legendary_actions?: TraitEntry[];
}

const ABILITIES: { key: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'; label: string }[] = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
];

const modifier = (score: number) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const HiddenSection = ({ label }: { label: string }) => (
  <p className="text-muted-theme" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
    🔒 {label} — not yet revealed by the DM.
  </p>
);

const MonsterPlayerView = () => {
  const { campaignId, id } = useParams();
  const navigate = useNavigate();
  const [monster, setMonster] = useState<RedactedMonster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaignItems(campaignId!);
        const found = res.data.find((i: RedactedMonster) => i.id === id);
        if (!found) {
          setError('This monster has not been revealed by the DM.');
        } else {
          setMonster(found);
        }
      } catch {
        setError('Could not load this monster.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [campaignId, id]);

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (error || !monster) return <p className="text-muted-theme">{error || 'Monster not found.'}</p>;

  const sections = monster.visible_sections || [];
  const identityVisible = sections.includes('identity');
  const statsVisible = sections.includes('stats');
  const traitsVisible = sections.includes('traits');
  const actionsVisible = sections.includes('actions');
  const legendaryVisible = sections.includes('legendary_actions');

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div className="sticky-save-bar">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate('/dashboard/monsters')}
        >
          ← Back
        </button>
      </div>

      <div className="card-theme p-4 mb-4">
        <div className="statblock-header">
          <div>
            <h2 className="text-theme mb-1">{monster.name}</h2>
            {!identityVisible && (
              <p className="statblock-subtitle">The DM hasn't revealed what this is yet.</p>
            )}
          </div>
          {monster.image_url && (
            <img
              src={monster.image_url}
              alt={monster.name}
              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}
            />
          )}
        </div>

        <div className="statblock-divider" />

        {identityVisible && monster.notes && (
          <div className="statblock-entry" dangerouslySetInnerHTML={{ __html: monster.notes }} />
        )}
        {!identityVisible && <HiddenSection label="Description" />}

        <div className="statblock-section-title">Stats</div>
        {statsVisible ? (
          <>
            <p className="statblock-property"><strong>Armor Class</strong> {monster.armor_class}</p>
            <p className="statblock-property"><strong>Hit Points</strong> {monster.current_hp}/{monster.max_hp}</p>
            {monster.challenge_rating && (
              <p className="statblock-property">
                <strong>Challenge</strong> <span className="statblock-cr-badge">CR {monster.challenge_rating}</span>
              </p>
            )}
            <div className="statblock-abilities">
              {ABILITIES.map(({ key, label }) => {
                const score = monster[key];
                if (score === undefined) return null;
                return (
                  <div className="statblock-ability" key={key}>
                    <span className="statblock-ability-label">{label}</span>
                    <span className="statblock-ability-score">{score}</span>
                    <span className="statblock-ability-mod">({modifier(score)})</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <HiddenSection label="Stats" />
        )}

        <div className="statblock-section-title">Traits</div>
        {traitsVisible ? (
          (monster.traits || []).length > 0 ? (
            monster.traits!.map((t, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{t.name}.</span> {t.desc}
              </p>
            ))
          ) : <p className="text-muted-theme mb-0">None.</p>
        ) : (
          <HiddenSection label="Traits" />
        )}

        <div className="statblock-section-title">Actions</div>
        {actionsVisible ? (
          (monster.actions || []).length > 0 ? (
            monster.actions!.map((a, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{a.name}.</span> {a.desc}
              </p>
            ))
          ) : <p className="text-muted-theme mb-0">None.</p>
        ) : (
          <HiddenSection label="Actions" />
        )}

        <div className="statblock-section-title">Legendary Actions</div>
        {legendaryVisible ? (
          (monster.legendary_actions || []).length > 0 ? (
            monster.legendary_actions!.map((a, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{a.name}.</span> {a.desc}
              </p>
            ))
          ) : <p className="text-muted-theme mb-0">None.</p>
        ) : (
          <HiddenSection label="Legendary Actions" />
        )}
      </div>
    </div>
  );
};

export default MonsterPlayerView;
