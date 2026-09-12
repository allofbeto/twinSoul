import React from 'react';

export const VISIBILITY_SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'identity', label: 'Identity', hint: 'Name, art, tags, description' },
  { key: 'stats', label: 'Stats', hint: 'AC, HP, ability scores, CR' },
  { key: 'traits', label: 'Traits', hint: 'Passive abilities' },
  { key: 'actions', label: 'Actions', hint: 'Attacks and abilities' },
  { key: 'legendary_actions', label: 'Legendary Actions', hint: 'End-of-turn abilities' },
];

interface Props {
  visibleSections: string[];
  onChange: (sections: string[]) => void;
  disabled: boolean;
}

const VisibilityPanel = ({ visibleSections, onChange, disabled }: Props) => {
  const toggle = (key: string) => {
    if (visibleSections.includes(key)) {
      onChange(visibleSections.filter((s) => s !== key));
    } else {
      onChange([...visibleSections, key]);
    }
  };

  return (
    <div className="card-theme p-4 mb-4">
      <h5 className="text-theme mb-1">Player Visibility</h5>
      <p className="text-muted-theme mb-3" style={{ fontSize: '0.85rem' }}>
        This monster is DM-only by default. Check a section to reveal it to the members of this campaign.
      </p>
      <div className="d-flex flex-column gap-2">
        {VISIBILITY_SECTIONS.map(({ key, label, hint }) => (
          <label
            key={key}
            className="d-flex align-items-center gap-2"
            style={{ cursor: disabled ? 'default' : 'pointer' }}
          >
            <input
              type="checkbox"
              checked={visibleSections.includes(key)}
              onChange={() => toggle(key)}
              disabled={disabled}
            />
            <span className="text-theme">{label}</span>
            <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>— {hint}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default VisibilityPanel;
