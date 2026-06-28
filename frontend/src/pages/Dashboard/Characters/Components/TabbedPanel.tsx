import React, { useState } from 'react';
import SkillSelector from './SkillSelector';

type Tab = 'skills' | 'inventory' | 'notes';

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
}
  
const TABS: { key: Tab; label: string }[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'notes', label: 'Notes' },
];

const TabbedPanel = ({ skills, onToggleSkill, abilityScores, proficiencyBonus }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>('skills');

  return (
    <div className="card-theme h-100">
      {/* Tab Bar */}
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

      {/* Tab Content */}
      <div className="p-3">
        {activeTab === 'skills' && (
            <SkillSelector
                selected={skills}
                onToggle={onToggleSkill}
                abilityScores={abilityScores}
                proficiencyBonus={proficiencyBonus}
            />
        )}
        {activeTab === 'inventory' && (
          <p className="text-muted-theme">Inventory coming soon.</p>
        )}
        {activeTab === 'notes' && (
          <p className="text-muted-theme">Notes coming soon.</p>
        )}
      </div>
    </div>
  );
};

export default TabbedPanel;