import React from 'react';
import { DND_SKILLS } from '../constants';
import { ABILITY_SHORT, AbilityKey, AbilityScoreSet, Overrides, SkillRank, passiveScore, skillBonus, skillRank } from '../sheetRules';
import { OverridableNumber } from './sheet/fields';

interface Props {
  skills: string[];
  expertise: string[];
  scores: AbilityScoreSet;
  proficiencyBonus: number;
  jackOfAllTrades: boolean;
  /** Cycles none → proficient → expertise → none. */
  onChange: (skills: string[], expertise: string[], skill: string) => void;
  /** "skill:Stealth" and "passive:Perception" values set by hand. */
  overrides: Overrides;
  onOverride: (key: string, value: number | null, label: string) => void;
  isOwner: boolean;
  children?: React.ReactNode; // extra panels under the list (languages)
}

const RANK_LABEL: Record<SkillRank, string> = {
  none: 'Not proficient',
  half: 'Half proficiency (Jack of All Trades)',
  proficient: 'Proficient',
  expertise: 'Expertise',
};

const PASSIVES = ['Perception', 'Insight', 'Investigation'];

const SkillSelector = ({ skills, expertise, scores, proficiencyBonus, jackOfAllTrades, onChange, overrides, onOverride, isOwner, children }: Props) => {
  const cycle = (name: string) => {
    if (expertise.includes(name)) {
      onChange(skills.filter((s) => s !== name), expertise.filter((s) => s !== name), name);
    } else if (skills.includes(name)) {
      onChange(skills, [...expertise, name], name);
    } else {
      onChange([...skills, name], expertise, name);
    }
  };

  return (
    <section className="sheet-card" aria-label="Skills">
      <h3 className="sheet-card-title">
        Skills
        {isOwner && <span className="sheet-card-hint">tap to cycle proficiency</span>}
      </h3>
      <ul className="sheet-list">
        {DND_SKILLS.map(({ name, ability }) => {
          const rank = skillRank(name, skills, expertise, jackOfAllTrades);
          const bonus = skillBonus(name, scores, skills, expertise, proficiencyBonus, jackOfAllTrades);
          return (
            <li key={name} className="sheet-list-row sheet-list-row--split">
              <button
                type="button"
                className="sheet-list-toggle"
                onClick={() => cycle(name)}
                disabled={!isOwner}
                title={RANK_LABEL[rank]}
              >
                <span className={`sheet-rank is-${rank}`} aria-label={RANK_LABEL[rank]} />
                <span className="sheet-list-name">{name}</span>
                <span className="sheet-list-ability">{ABILITY_SHORT[ability as AbilityKey]}</span>
              </button>
              <span className="sheet-list-bonus">
                <OverridableNumber
                  auto={bonus}
                  value={overrides[`skill:${name}`]}
                  signed
                  editable={isOwner}
                  onChange={(v) => onOverride(`skill:${name}`, v, name)}
                  aria-label={`${name} bonus`}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="sheet-passives">
        {PASSIVES.map((skill) => (
          <div key={skill} className="sheet-passive">
            <span className="sheet-passive-value">
              <OverridableNumber
                auto={10 + (overrides[`skill:${skill}`] ?? (passiveScore(skill, scores, skills, expertise, proficiencyBonus, jackOfAllTrades) - 10))}
                value={overrides[`passive:${skill}`]}
                editable={isOwner}
                onChange={(v) => onOverride(`passive:${skill}`, v, `passive ${skill}`)}
                aria-label={`Passive ${skill}`}
              />
            </span>
            <span className="sheet-label">Passive {skill}</span>
          </div>
        ))}
      </div>

      {children}
    </section>
  );
};

export default SkillSelector;
