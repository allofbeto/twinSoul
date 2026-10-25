import SkillSelector from '../../Characters/Components/SkillSelector';
import { proficiencyForCr } from '../statblock';

interface Props {
  skills: string[];
  onToggle: (skill: string) => void;
  scores: {
    strength: number; dexterity: number; constitution: number;
    intelligence: number; wisdom: number; charisma: number;
  };
  challengeRating?: string | null;
  isOwner: boolean;
}

// 5e: an NPC's proficiency bonus follows its challenge rating (CR 0–4 → +2, 5–8 → +3, …).
const NpcSkills = ({ skills, onToggle, scores, challengeRating, isOwner }: Props) => {
  const pb = proficiencyForCr(challengeRating);
  return (
    <div className="card-theme p-4 mb-4">
      <div className="d-flex justify-content-between align-items-baseline mb-3">
        <h5 className="text-theme mb-0">Skills</h5>
        <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>
          Proficiency +{pb} (from CR {challengeRating || '0'})
        </span>
      </div>
      <SkillSelector
        selected={skills}
        onToggle={onToggle}
        abilityScores={scores}
        proficiencyBonus={pb}
        isOwner={isOwner}
      />
    </div>
  );
};

export default NpcSkills;
