import React from 'react';
import { RaceDraft, SIZES, SubraceDraft } from './draftTypes';
import EntryListEditor from './EntryListEditor';
import IconPicker from './IconPicker';
import AbilityBonusEditor from './AbilityBonusEditor';

interface Props {
  draft: RaceDraft;
  onChange: (draft: RaceDraft) => void;
}

const HomebrewRaceForm = ({ draft, onChange }: Props) => {
  const set = <K extends keyof RaceDraft>(key: K, value: RaceDraft[K]) => onChange({ ...draft, [key]: value });
  const setSubrace = (i: number, patch: Partial<SubraceDraft>) =>
    set('subraces', draft.subraces.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-2">
        <div className="col-md-6">
          <label className="form-label text-muted-theme">Race name</label>
          <input className="form-control input-theme" value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label text-muted-theme">Speed (ft.)</label>
          <input
            type="number"
            className="form-control input-theme"
            min={0}
            max={120}
            step={5}
            value={draft.speed}
            onChange={(e) => set('speed', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label text-muted-theme">Size</label>
          <select className="form-select input-theme" value={draft.size} onChange={(e) => set('size', e.target.value)}>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label text-muted-theme d-block">Icon</label>
        <IconPicker kind="race" value={draft.icon} onChange={(key) => set('icon', key)} />
      </div>

      <div>
        <label className="form-label text-muted-theme">Description</label>
        <textarea className="form-control input-theme" rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div>
        <label className="form-label text-muted-theme d-block">Ability score increases</label>
        <AbilityBonusEditor bonuses={draft.ability_bonuses} onChange={(b) => set('ability_bonuses', b)} />
      </div>

      <div>
        <label className="form-label text-muted-theme">Languages</label>
        <input
          className="form-control input-theme"
          placeholder="Common, Auran"
          value={draft.languages.join(', ')}
          onChange={(e) => set('languages', e.target.value.split(',').map((l) => l.trimStart()))}
        />
      </div>

      <details>
        <summary className="text-muted-theme" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>Age, alignment and size details</summary>
        <div className="d-flex flex-column gap-2 mt-2">
          <input className="form-control input-theme form-control-sm" placeholder="Age" value={draft.age} onChange={(e) => set('age', e.target.value)} />
          <input className="form-control input-theme form-control-sm" placeholder="Alignment" value={draft.alignment} onChange={(e) => set('alignment', e.target.value)} />
          <input className="form-control input-theme form-control-sm" placeholder="Size details (height, weight)" value={draft.size_description} onChange={(e) => set('size_description', e.target.value)} />
        </div>
      </details>

      <div>
        <h6 className="text-theme mb-2">Traits</h6>
        <EntryListEditor entries={draft.traits} onChange={(t) => set('traits', t)} noun="trait" />
      </div>

      <div>
        <h6 className="text-theme mb-2">Subraces <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>(optional)</span></h6>
        <div className="d-flex flex-column gap-3">
          {draft.subraces.map((sr, i) => (
            <div key={i} className="homebrew-subsection">
              <div className="d-flex gap-2 mb-2">
                <input
                  className="form-control input-theme form-control-sm"
                  placeholder="Subrace name"
                  value={sr.name}
                  onChange={(e) => setSubrace(i, { name: e.target.value })}
                />
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => set('subraces', draft.subraces.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              </div>
              <textarea
                className="form-control input-theme form-control-sm mb-2"
                rows={2}
                placeholder="Description"
                value={sr.desc}
                onChange={(e) => setSubrace(i, { desc: e.target.value })}
              />
              <AbilityBonusEditor bonuses={sr.ability_bonuses} onChange={(b) => setSubrace(i, { ability_bonuses: b })} />
              <div className="mt-2">
                <EntryListEditor entries={sr.traits} onChange={(t) => setSubrace(i, { traits: t })} noun="trait" />
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => set('subraces', [...draft.subraces, { name: '', desc: '', ability_bonuses: [], traits: [] }])}
            >
              + Add subrace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomebrewRaceForm;
