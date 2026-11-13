import React from 'react';
import { ABILITY_CODES, BonusDraft } from './draftTypes';

interface Props {
  bonuses: BonusDraft[];
  onChange: (bonuses: BonusDraft[]) => void;
}

// One stepper per ability; 0 means no bonus.
const AbilityBonusEditor = ({ bonuses, onChange }: Props) => {
  const valueFor = (code: string) => bonuses.find((b) => b.ability_score === code)?.bonus || 0;
  const set = (code: string, bonus: number) => {
    const rest = bonuses.filter((b) => b.ability_score !== code);
    onChange(bonus === 0 ? rest : [...rest, { ability_score: code, bonus }]);
  };

  return (
    <div className="homebrew-bonus-grid">
      {ABILITY_CODES.map((code) => (
        <label key={code} className="homebrew-bonus">
          <span>{code.toUpperCase()}</span>
          <input
            type="number"
            className="form-control input-theme form-control-sm text-center"
            min={-4}
            max={4}
            value={valueFor(code)}
            onChange={(e) => set(code, Math.max(-4, Math.min(4, parseInt(e.target.value) || 0)))}
          />
        </label>
      ))}
    </div>
  );
};

export default AbilityBonusEditor;
