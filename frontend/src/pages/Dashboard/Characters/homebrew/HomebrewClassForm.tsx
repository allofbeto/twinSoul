import React from 'react';
import { ABILITY_CODES, ClassDraft, HIT_DICE, SubclassDraft } from './draftTypes';
import EntryListEditor from './EntryListEditor';
import IconPicker from './IconPicker';

interface Props {
  draft: ClassDraft;
  onChange: (draft: ClassDraft) => void;
}

const HomebrewClassForm = ({ draft, onChange }: Props) => {
  const set = <K extends keyof ClassDraft>(key: K, value: ClassDraft[K]) => onChange({ ...draft, [key]: value });
  const setSubclass = (i: number, patch: Partial<SubclassDraft>) =>
    set('subclasses', draft.subclasses.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const toggleSave = (code: string) =>
    set('saving_throws', draft.saving_throws.includes(code) ? draft.saving_throws.filter((c) => c !== code) : [...draft.saving_throws, code]);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-2">
        <div className="col-md-6">
          <label className="form-label text-muted-theme">Class name</label>
          <input className="form-control input-theme" value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label text-muted-theme">Hit die</label>
          <select className="form-select input-theme" value={draft.hit_die} onChange={(e) => set('hit_die', parseInt(e.target.value))}>
            {HIT_DICE.map((d) => <option key={d} value={d}>d{d}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label text-muted-theme">Spellcasting</label>
          <select className="form-select input-theme" value={draft.spellcasting_ability} onChange={(e) => set('spellcasting_ability', e.target.value)}>
            <option value="">None</option>
            {ABILITY_CODES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label text-muted-theme d-block">Icon</label>
        <IconPicker kind="class" value={draft.icon} onChange={(key) => set('icon', key)} />
      </div>

      <div>
        <label className="form-label text-muted-theme">Description</label>
        <textarea className="form-control input-theme" rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div>
        <label className="form-label text-muted-theme d-block">Saving throw proficiencies</label>
        <div className="d-flex flex-wrap gap-2">
          {ABILITY_CODES.map((c) => (
            <button
              key={c}
              type="button"
              className={`btn btn-sm ${draft.saving_throws.includes(c) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
              onClick={() => toggleSave(c)}
              aria-pressed={draft.saving_throws.includes(c)}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label text-muted-theme">Other proficiencies</label>
        <input
          className="form-control input-theme"
          placeholder="Light armor, Simple weapons, Alchemist's supplies"
          value={draft.proficiencies.join(', ')}
          onChange={(e) => set('proficiencies', e.target.value.split(',').map((p) => p.trimStart()))}
        />
      </div>

      <div>
        <h6 className="text-theme mb-2">Class features</h6>
        <EntryListEditor entries={draft.features} onChange={(f) => set('features', f)} noun="feature" withLevel />
      </div>

      <div>
        <h6 className="text-theme mb-2">Subclasses <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>(optional)</span></h6>
        <div className="row g-2 mb-2">
          <div className="col-md-6">
            <label className="form-label text-muted-theme" style={{ fontSize: '0.8rem' }}>Subclass is called</label>
            <input
              className="form-control input-theme form-control-sm"
              placeholder="e.g. Order, Circle, Oath"
              value={draft.subclass_flavor}
              onChange={(e) => set('subclass_flavor', e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label text-muted-theme" style={{ fontSize: '0.8rem' }}>Chosen at level</label>
            <input
              type="number"
              className="form-control input-theme form-control-sm"
              min={0}
              max={20}
              value={draft.subclass_choice_level}
              onChange={(e) => set('subclass_choice_level', Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
            />
          </div>
        </div>
        <div className="d-flex flex-column gap-3">
          {draft.subclasses.map((sc, i) => (
            <div key={i} className="homebrew-subsection">
              <div className="d-flex gap-2 mb-2">
                <input
                  className="form-control input-theme form-control-sm"
                  placeholder="Subclass name"
                  value={sc.name}
                  onChange={(e) => setSubclass(i, { name: e.target.value })}
                />
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => set('subclasses', draft.subclasses.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              </div>
              <textarea
                className="form-control input-theme form-control-sm mb-2"
                rows={2}
                placeholder="Description"
                value={sc.desc}
                onChange={(e) => setSubclass(i, { desc: e.target.value })}
              />
              <EntryListEditor entries={sc.features} onChange={(f) => setSubclass(i, { features: f })} noun="feature" withLevel />
            </div>
          ))}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() =>
                set('subclasses', [...draft.subclasses, { name: '', desc: '', features: [{ level: draft.subclass_choice_level || 3, name: '', desc: '' }] }])
              }
            >
              + Add subclass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomebrewClassForm;
