import React, { useState } from 'react';
import SkillSelector from './SkillSelector';
import InventoryTable from './InventoryTable';
import ClassFeatures from './ClassFeatures';
import { CharacterClassSummary } from '../classTypes';

type Tab = 'skills' | 'features' | 'inventory' | 'notes';

interface Props {
  skills: string[];
  onToggleSkill: (skill: string) => void;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  proficiencyBonus: number;
  characterId: string;
  classSummaries: CharacterClassSummary[];
  supportsClasses: boolean;
  isOwner: boolean;
}

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'features', label: 'Features' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'notes', label: 'Notes' },
];

const TabbedPanel = ({ skills, onToggleSkill, abilityScores, proficiencyBonus, characterId, classSummaries, supportsClasses, isOwner }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const TABS = ALL_TABS.filter((t) => t.key !== 'features' || supportsClasses);

  return (
    <div className="card-theme h-100">
      <div className="tabbed-panel-tabs">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            className={`tabbed-panel-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {activeTab === 'skills' && (
          <SkillSelector
            selected={skills}
            onToggle={onToggleSkill}
            abilityScores={abilityScores}
            proficiencyBonus={proficiencyBonus}
            isOwner={isOwner}
          />
        )}
        {activeTab === 'features' && (
          <ClassFeatures classSummaries={classSummaries} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTable characterId={characterId} />
        )}
        {activeTab === 'notes' && (
          <p className="text-muted-theme">Notes coming soon.</p>
        )}
      </div>
    </div>
  );
};

export default TabbedPanel;