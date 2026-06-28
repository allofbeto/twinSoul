import React, { useState } from 'react';
import { DND_SKILLS } from '../constants';

interface Props {
  selected: string[];
  onToggle: (skill: string) => void;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  proficiencyBonus: number;
  isOwner: boolean;
}

const ABILITY_LABELS: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

const getModifier = (score: number) => Math.floor((score - 10) / 2);

const SkillSelector = ({ selected, onToggle, abilityScores, proficiencyBonus, isOwner }: Props) => {
  const [openGroup, setOpenGroup] = useState<string>('dexterity');

  const grouped = DND_SKILLS.reduce((acc, skill) => {
    if (!acc[skill.ability]) acc[skill.ability] = [];
    acc[skill.ability].push(skill);
    return acc;
  }, {} as Record<string, typeof DND_SKILLS>);

  const toggleGroup = (ability: string) => {
    setOpenGroup((prev) => (prev === ability ? '' : ability));
  };

  return (
    <div className="d-flex flex-column gap-2">
      {/* Proficient skills summary */}
      {selected.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {selected.map((skill) => (
            <span key={skill} className="badge-cls" style={{ fontSize: '0.7rem' }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {Object.entries(grouped).map(([ability, skills]) => {
        const abilityMod = getModifier((abilityScores as any)[ability]);
        const isOpen = openGroup === ability;
        const proficientInGroup = skills.filter((s) => selected.includes(s.name));

        return (
          <div key={ability} className="skill-group">
            {/* Group Header */}
            <div
              className="skill-group-header"
              onClick={() => toggleGroup(ability)}
            >
              <div className="d-flex align-items-center gap-2">
                <span className="skill-group-label">{ABILITY_LABELS[ability]}</span>
                <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>
                  {abilityMod >= 0 ? `+${abilityMod}` : abilityMod}
                </span>
                {!isOpen && proficientInGroup.length > 0 && (
                  <span className="text-muted-theme" style={{ fontSize: '0.75rem' }}>
                    — {proficientInGroup.map((s) => s.name).join(', ')}
                  </span>
                )}
              </div>
              <span className="text-muted-theme" style={{ fontSize: '0.75rem' }}>
                {isOpen ? '▾' : '▸'}
              </span>
            </div>

            {/* Skills */}
            {isOpen && (
              <div>
                {skills.map(({ name }) => {
                  const isProficient = selected.includes(name);
                  const bonus = isProficient ? abilityMod + proficiencyBonus : abilityMod;
                  const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;

                  return (
                    <div
                      key={name}
                      className="skill-row"
                      onClick={() => isOwner && onToggle(name)}
                      style={{ cursor: isOwner ? 'pointer' : 'default' }}
                    >
                      <div className={`skill-proficiency-dot ${isProficient ? 'active' : ''}`} />
                      <span className="skill-name">{name}</span>
                      <span className="skill-bonus">{bonusStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SkillSelector;