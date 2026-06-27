import React from 'react';
import { DND_SKILLS } from '../constants';

interface Props {
  selected: string[];
  onToggle: (skill: string) => void;
}

const SkillSelector = ({ selected, onToggle }: Props) => {
  return (
    <div className="card-theme p-4 mb-4">
      <h5 className="text-theme mb-3">Skill Proficiencies</h5>
      <div className="d-flex flex-wrap gap-2">
        {DND_SKILLS.map((skill) => (
          <button
            type="button"
            key={skill}
            className={`btn btn-sm ${selected.includes(skill) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
            onClick={() => onToggle(skill)}
          >
            {skill}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SkillSelector;