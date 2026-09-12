import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMonster } from '../../../api/backendHelpers';
import '../../../styles/statBlock.css';

interface Monster {
  id: string;
  name: string;
  size: string;
  creature_type: string;
  alignment: string;
  armor_class: number;
  armor_desc: string | null;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, string | boolean>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  saving_throws: Record<string, number>;
  skills: Record<string, number>;
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  senses: Record<string, string | number>;
  languages: string | null;
  challenge_rating: string;
  proficiency_bonus: number;
  xp: number;
  special_abilities: { name: string; desc: string }[];
  actions: { name: string; desc: string }[];
  legendary_actions: { name: string; desc: string }[];
  reactions: { name: string; desc: string }[];
  image_url: string | null;
  source: string;
}

const ABILITIES: { key: keyof Monster; label: string }[] = [
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

const formatSpeed = (speed: Record<string, string | boolean>) =>
  Object.entries(speed || {})
    .map(([type, value]) => (type === 'walk' ? value : `${type} ${value}`))
    .join(', ');

const formatSenses = (senses: Record<string, string | number>) => {
  const { passive_perception, ...rest } = senses || {};
  const parts = Object.entries(rest).map(([type, value]) => `${type.replace('_', ' ')} ${value}`);
  if (passive_perception !== undefined) parts.push(`passive Perception ${passive_perception}`);
  return parts.join(', ');
};

const MonsterStatBlock = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monster, setMonster] = useState<Monster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMonster(id!);
        setMonster(res.data);
      } catch {
        setError('Could not load this monster.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (error || !monster) return <p className="text-muted-theme">{error || 'Monster not found.'}</p>;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div className="sticky-save-bar">
        <div className="d-flex align-items-center justify-content-between">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate('/dashboard/monsters')}
          >
            ← Back
          </button>
          <span className="text-muted-theme" style={{ fontSize: '0.75rem' }}>{monster.source}</span>
        </div>
      </div>

      <div className="card-theme p-4 mb-4">
        <div className="statblock-header">
          <div>
            <h2 className="text-theme mb-1">{monster.name}</h2>
            <p className="statblock-subtitle">
              {monster.size} {monster.creature_type}, {monster.alignment}
            </p>
          </div>
          {monster.image_url && (
            <img
              src={monster.image_url}
              alt={monster.name}
              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="statblock-divider" />

        <p className="statblock-property">
          <strong>Armor Class</strong> {monster.armor_class}{monster.armor_desc ? ` (${monster.armor_desc})` : ''}
        </p>
        <p className="statblock-property">
          <strong>Hit Points</strong> {monster.hit_points} ({monster.hit_dice})
        </p>
        <p className="statblock-property">
          <strong>Speed</strong> {formatSpeed(monster.speed) || '—'}
        </p>

        <div className="statblock-abilities">
          {ABILITIES.map(({ key, label }) => {
            const score = monster[key] as number;
            return (
              <div className="statblock-ability" key={key}>
                <span className="statblock-ability-label">{label}</span>
                <span className="statblock-ability-score">{score}</span>
                <span className="statblock-ability-mod">({modifier(score)})</span>
              </div>
            );
          })}
        </div>

        {Object.keys(monster.saving_throws || {}).length > 0 && (
          <p className="statblock-property">
            <strong>Saving Throws</strong>{' '}
            {Object.entries(monster.saving_throws).map(([ab, val]) => `${ab} +${val}`).join(', ')}
          </p>
        )}
        {Object.keys(monster.skills || {}).length > 0 && (
          <p className="statblock-property">
            <strong>Skills</strong>{' '}
            {Object.entries(monster.skills).map(([sk, val]) => `${sk} +${val}`).join(', ')}
          </p>
        )}
        {monster.damage_vulnerabilities?.length > 0 && (
          <p className="statblock-property">
            <strong>Damage Vulnerabilities</strong> {monster.damage_vulnerabilities.join(', ')}
          </p>
        )}
        {monster.damage_resistances?.length > 0 && (
          <p className="statblock-property">
            <strong>Damage Resistances</strong> {monster.damage_resistances.join(', ')}
          </p>
        )}
        {monster.damage_immunities?.length > 0 && (
          <p className="statblock-property">
            <strong>Damage Immunities</strong> {monster.damage_immunities.join(', ')}
          </p>
        )}
        {monster.condition_immunities?.length > 0 && (
          <p className="statblock-property">
            <strong>Condition Immunities</strong> {monster.condition_immunities.join(', ')}
          </p>
        )}
        <p className="statblock-property">
          <strong>Senses</strong> {formatSenses(monster.senses) || '—'}
        </p>
        <p className="statblock-property">
          <strong>Languages</strong> {monster.languages || '—'}
        </p>
        <p className="statblock-property">
          <strong>Challenge</strong>{' '}
          <span className="statblock-cr-badge">CR {monster.challenge_rating}</span>{' '}
          ({monster.xp?.toLocaleString()} XP) — Proficiency Bonus +{monster.proficiency_bonus}
        </p>

        {monster.special_abilities?.length > 0 && (
          <>
            <div className="statblock-section-title">Traits</div>
            {monster.special_abilities.map((t, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{t.name}.</span> {t.desc}
              </p>
            ))}
          </>
        )}

        {monster.actions?.length > 0 && (
          <>
            <div className="statblock-section-title">Actions</div>
            {monster.actions.map((a, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{a.name}.</span> {a.desc}
              </p>
            ))}
          </>
        )}

        {monster.legendary_actions?.length > 0 && (
          <>
            <div className="statblock-section-title">Legendary Actions</div>
            {monster.legendary_actions.map((a, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{a.name}.</span> {a.desc}
              </p>
            ))}
          </>
        )}

        {monster.reactions?.length > 0 && (
          <>
            <div className="statblock-section-title">Reactions</div>
            {monster.reactions.map((a, i) => (
              <p className="statblock-entry" key={i}>
                <span className="statblock-entry-name">{a.name}.</span> {a.desc}
              </p>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default MonsterStatBlock;
