import React, { useState } from 'react';
import CombatantPicker from './CombatantPicker';
import DifficultyPanel from './DifficultyPanel';
import MonsterDetailSlideOver from '../../Monsters/Components/MonsterDetailSlideOver';
import type { BestiaryOption, CombatantRow, HomebrewOption, PhaseRow } from './types';

interface Props {
  phase: PhaseRow;
  index: number;
  bestiary: BestiaryOption[];
  homebrew: HomebrewOption[];
  campaignId: string | null;
  canRemove: boolean;
  onChange: (patch: Partial<PhaseRow>) => void;
  onRemove: () => void;
  onAddCombatant: (row: CombatantRow) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onRemoveCombatant: (key: string) => void;
}

const PhaseBuilder = ({
  phase,
  index,
  bestiary,
  homebrew,
  campaignId,
  canRemove,
  onChange,
  onRemove,
  onAddCombatant,
  onQuantityChange,
  onRemoveCombatant,
}: Props) => {
  const [viewMonsterId, setViewMonsterId] = useState<string | null>(null);

  return (
    <div className="card-theme p-4 mb-4">
      <div className="d-flex align-items-start gap-3 mb-3 flex-wrap">
        <div className="flex-grow-1" style={{ minWidth: '200px' }}>
          <label className="form-label text-muted-theme">Phase {index + 1} Name</label>
          <input
            type="text"
            className="form-control input-theme"
            value={phase.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="flex-grow-1" style={{ minWidth: '260px' }}>
          <label className="form-label text-muted-theme">Escalation Trigger (optional)</label>
          <input
            type="text"
            className="form-control input-theme"
            placeholder="e.g. Triggers when the boss drops below half HP"
            value={phase.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
        {canRemove && (
          <button
            type="button"
            className="btn btn-danger btn-sm align-self-end"
            onClick={onRemove}
          >
            Remove Phase
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem', alignItems: 'start' }}>
        <CombatantPicker
          bestiary={bestiary}
          homebrew={homebrew}
          combatants={phase.combatants}
          onAdd={onAddCombatant}
          onRemove={onRemoveCombatant}
        />
        <DifficultyPanel
          combatants={phase.combatants}
          campaignId={campaignId}
          onQuantityChange={onQuantityChange}
          onRemove={onRemoveCombatant}
          onView={(c) => c.monster_id && setViewMonsterId(c.monster_id)}
        />
      </div>

      <MonsterDetailSlideOver
        monsterId={viewMonsterId}
        onClose={() => setViewMonsterId(null)}
        isAdded
        onRemove={() => {
          const row = phase.combatants.find((c) => c.monster_id === viewMonsterId && !c._destroy);
          if (row) onRemoveCombatant(row.key);
          setViewMonsterId(null);
        }}
      />
    </div>
  );
};

export default PhaseBuilder;
