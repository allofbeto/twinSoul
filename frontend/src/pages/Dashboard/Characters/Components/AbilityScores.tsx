import React from 'react';
import { ABILITY_SCORES } from '../constants';

interface Props {
  form: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AbilityScores = ({ form, handleNumberChange }: Props) => {
  return (
    <div className="card-theme p-4 mb-4">
      <h5 className="text-theme mb-3">Ability Scores</h5>
      <div className="row g-3">
        {ABILITY_SCORES.map(({ key, label }) => (
          <div className="col-4 col-md-2" key={key}>
            <label className="form-label text-muted-theme text-center d-block">{label}</label>
            <input
              type="number"
              name={key}
              className="form-control input-theme text-center"
              min={1}
              max={30}
              value={(form as any)[key]}
              onChange={handleNumberChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AbilityScores;