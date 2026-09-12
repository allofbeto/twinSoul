import React, { useEffect, useState } from 'react';
import '../../../../styles/statBlock.css';

export interface MonsterStatBlockData {
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
  habitats?: string[];
}

const ABILITIES: { key: keyof MonsterStatBlockData; label: string }[] = [
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

interface Props {
  monster: MonsterStatBlockData;
}

const MonsterStatBlockContent = ({ monster }: Props) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  return (
  <div>
    <div className="statblock-header">
      <div>
        <h2 className="text-theme mb-1">{monster.name}</h2>
        <p className="statblock-subtitle">
          {monster.size} {monster.creature_type}, {monster.alignment}
        </p>
      </div>
      {monster.image_url && (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Expand image of ${monster.name}`}
          style={{
            position: 'relative',
            width: 96,
            height: 96,
            padding: 0,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            overflow: 'hidden',
            cursor: 'zoom-in',
            flexShrink: 0,
          }}
        >
          <img
            src={monster.image_url}
            alt={monster.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.55)',
              borderRadius: '50%',
              color: '#fff',
              fontSize: '0.75rem',
            }}
          >
            <i className="bx bx-expand" />
          </span>
        </button>
      )}
    </div>

    {lightboxOpen && monster.image_url && (
      <div
        onClick={() => setLightboxOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '2rem',
          cursor: 'zoom-out',
        }}
      >
        <button
          type="button"
          onClick={() => setLightboxOpen(false)}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(0, 0, 0, 0.4)',
            color: '#fff',
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <img
          src={monster.image_url}
          alt={monster.name}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--border-radius)', cursor: 'default' }}
        />
      </div>
    )}

    {monster.habitats && monster.habitats.length > 0 && (
      <div className="d-flex flex-wrap gap-1 mb-2">
        {monster.habitats.map((h) => (
          <span key={h} className="badge-cls" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{h}</span>
        ))}
      </div>
    )}

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
  );
};

export default MonsterStatBlockContent;
