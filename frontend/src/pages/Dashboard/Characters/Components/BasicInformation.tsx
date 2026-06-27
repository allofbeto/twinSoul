import React from 'react';
import { DND_RACES } from '../constants';

interface Props {
  form: {
    name: string;
    race: string;
    level: number;
    max_hp: number;
    current_hp: number;
    armor_class: number;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BasicInfo = ({ form, handleChange, handleNumberChange }: Props) => {
  return (
    <div className="card-theme p-4 mb-4">
      <h5 className="text-theme mb-3">Basic Info</h5>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label text-muted-theme">Name</label>
          <input
            type="text"
            name="name"
            className="form-control input-theme"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label text-muted-theme">Race</label>
          <select
            name="race"
            className="form-select input-theme"
            value={form.race}
            onChange={handleChange}
            required
          >
            {DND_RACES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label text-muted-theme">Level</label>
          <input
            type="number"
            name="level"
            className="form-control input-theme"
            min={1}
            max={20}
            value={form.level}
            onChange={handleNumberChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label text-muted-theme">Max HP</label>
          <input
            type="number"
            name="max_hp"
            className="form-control input-theme"
            min={0}
            value={form.max_hp}
            onChange={handleNumberChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label text-muted-theme">Current HP</label>
          <input
            type="number"
            name="current_hp"
            className="form-control input-theme"
            min={0}
            value={form.current_hp}
            onChange={handleNumberChange}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label text-muted-theme">Armor Class</label>
          <input
            type="number"
            name="armor_class"
            className="form-control input-theme"
            min={0}
            value={form.armor_class}
            onChange={handleNumberChange}
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;