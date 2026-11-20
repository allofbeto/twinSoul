import React, { useContext, useRef, useState } from 'react';
import UseTracker from './UseTracker';
import { NumberField, OverridableNumber, TextField } from './fields';
import { NarrowContext } from '../../useNarrow';
import { useDockAction } from '../../dockAction';
import { CustomTracker, HitDiePool, Overrides, SlotLevel, TrackedResource } from '../../sheetRules';

interface Props {
  slots: SlotLevel[];
  resources: TrackedResource[];
  hitDice: HitDiePool[];
  customTrackers: CustomTracker[];
  overrides: Overrides;
  isOwner: boolean;
  onSlotUse: (key: string, used: number) => void;
  onResourceUse: (key: string, used: number) => void;
  onHitDiceUse: (die: string, used: number) => void;
  onOverride: (key: string, value: number | null, label: string) => void;
  onCustomChange: (trackers: CustomTracker[], label: string) => void;
}

const RECHARGE_LABEL: Record<CustomTracker['recharge'], string> = {
  short: 'short rest',
  long: 'long rest',
  none: 'no reset',
};

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// What you spend during play: spell slots, class resources, hit dice, and the
// table's own counters. "Adjust" lets the table set any maximum by hand.
const ResourcesPanel = ({
  slots, resources, hitDice, customTrackers, overrides, isOwner,
  onSlotUse, onResourceUse, onHitDiceUse, onOverride, onCustomChange,
}: Props) => {
  const [adjusting, setAdjusting] = useState(false);
  const narrow = useContext(NarrowContext);
  const newTrackerRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState({ label: '', total: 3, recharge: 'long' as CustomTracker['recharge'] });

  const maxEditor = (key: string, auto: number, label: string) => adjusting && (
    <span className="sheet-tracker-max">
      max
      <OverridableNumber
        auto={auto}
        value={overrides[key]}
        editable
        max={99}
        onChange={(v) => onOverride(key, v, `${label} max`)}
        aria-label={`${label} maximum`}
      />
    </span>
  );

  const missingSlotLevels = ORDINALS.map((_, i) => `${i + 1}`).filter((k) => !slots.some((s) => s.key === k));

  const updateCustom = (id: string, patch: Partial<CustomTracker>, label: string) =>
    onCustomChange(customTrackers.map((t) => (t.id === id ? { ...t, ...patch } : t)), label);

  const addCustom = () => {
    const label = draft.label.trim();
    if (!label) return;
    onCustomChange([...customTrackers, { id: newId(), label, total: Math.max(1, draft.total), used: 0, recharge: draft.recharge }], `add ${label}`);
    setDraft({ label: '', total: 3, recharge: 'long' });
  };

  // Phones: the dock's button jumps to the new-tracker row.
  useDockAction(isOwner && narrow ? 'Add' : null, () => {
    newTrackerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    newTrackerRef.current?.focus({ preventScroll: true });
  });

  const q = search.trim().toLowerCase();
  const matchesSearch = (label: string) => !q || label.toLowerCase().includes(q);
  const shownSlots = slots.filter((s) => matchesSearch(s.label));
  const shownResources = resources.filter((r) => matchesSearch(r.label));
  const shownHitDice = hitDice.filter((h) => matchesSearch(h.die));
  const shownCustom = customTrackers.filter((t) => matchesSearch(t.label));
  const totalTrackers = slots.length + resources.length + hitDice.length + customTrackers.length;

  return (
    <div className="d-flex flex-column gap-3">
      {isOwner && (
        <div className="sheet-resources-head">
          <span className="text-muted-theme" style={{ fontSize: '0.78rem' }}>
            {adjusting ? 'Set any maximum by hand. A dot marks your table\'s numbers.' : 'Tap a pip to use it, tap an empty one to get it back.'}
          </span>
          <button type="button" className={`sheet-btn ${adjusting ? 'sheet-btn--primary' : ''}`} onClick={() => setAdjusting((a) => !a)} aria-pressed={adjusting}>
            {adjusting ? 'Done' : 'Adjust'}
          </button>
        </div>
      )}

      {totalTrackers > 5 && (
        <input
          className="form-control input-theme"
          placeholder="Search trackers by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search resources"
        />
      )}

      {(shownSlots.length > 0 || adjusting) && (
        <div>
          <h4 className="sheet-section-title">Spell Slots</h4>
          <div className="sheet-trackers">
            {shownSlots.map((s) => (
              <UseTracker
                key={s.key}
                label={s.label}
                total={s.total}
                used={s.used}
                hint={s.key === 'pact' ? 'short rest' : undefined}
                extra={maxEditor(`slots:${s.key}`, s.autoTotal, `${s.label} slots`)}
                onChange={isOwner ? (n) => onSlotUse(s.key, n) : undefined}
              />
            ))}
            {adjusting && missingSlotLevels.length > 0 && (
              <select
                className="form-select form-select-sm input-theme sheet-add-select"
                value=""
                onChange={(e) => e.target.value && onOverride(`slots:${e.target.value}`, 1, `${ORDINALS[Number(e.target.value) - 1]} slots`)}
                aria-label="Add a spell slot level"
              >
                <option value="">+ Add a spell slot level...</option>
                {missingSlotLevels.map((k) => <option key={k} value={k}>{ORDINALS[Number(k) - 1]} level</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {shownResources.length > 0 && (
        <div>
          <h4 className="sheet-section-title">Class Resources</h4>
          <div className="sheet-trackers">
            {shownResources.map((r) => (
              <UseTracker
                key={r.key}
                label={r.label}
                total={r.total}
                used={r.used}
                hint={r.recharge === 'short' ? 'short rest' : 'long rest'}
                extra={maxEditor(`resource:${r.key}`, r.autoTotal, r.label)}
                onChange={isOwner ? (n) => onResourceUse(r.key, n) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {shownHitDice.length > 0 && (
        <div>
          <h4 className="sheet-section-title">Hit Dice</h4>
          <div className="sheet-trackers">
            {shownHitDice.map((p) => (
              <UseTracker
                key={p.die}
                label={p.die}
                total={p.total}
                used={p.used}
                hint="half back on a long rest"
                extra={maxEditor(`hitdice:${p.die}`, p.autoTotal, `${p.die} hit dice`)}
                onChange={isOwner ? (n) => onHitDiceUse(p.die, n) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="sheet-section-title">Table Trackers</h4>
        <div className="sheet-trackers">
          {shownCustom.length === 0 && !isOwner && <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>None.</p>}
          {shownCustom.map((t) => (
            adjusting ? (
              <div key={t.id} className="sheet-tracker sheet-tracker--editing">
                <TextField value={t.label} onCommit={(label) => updateCustom(t.id, { label }, 'tracker name')} required maxLength={40} aria-label="Tracker name" />
                <span className="sheet-tracker-max">
                  max
                  <NumberField className="sheet-ovr-input" value={t.total} min={1} max={99} onCommit={(total) => updateCustom(t.id, { total, used: Math.min(t.used, total) }, `${t.label} max`)} aria-label={`${t.label} maximum`} />
                </span>
                <select
                  className="form-select form-select-sm input-theme"
                  value={t.recharge}
                  onChange={(e) => updateCustom(t.id, { recharge: e.target.value as CustomTracker['recharge'] }, `${t.label} reset`)}
                  aria-label={`${t.label} resets on`}
                >
                  {Object.entries(RECHARGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button type="button" className="sheet-link sheet-link--danger" onClick={() => onCustomChange(customTrackers.filter((x) => x.id !== t.id), `remove ${t.label}`)}>
                  Remove
                </button>
              </div>
            ) : (
              <UseTracker
                key={t.id}
                label={t.label}
                total={t.total}
                used={t.used}
                hint={RECHARGE_LABEL[t.recharge]}
                onChange={isOwner ? (used) => updateCustom(t.id, { used }, t.label) : undefined}
              />
            )
          ))}

          {isOwner && (
            <div className="sheet-tracker-add">
              <input
                className="form-control form-control-sm input-theme"
                placeholder="New tracker, e.g. Luck Points"
                value={draft.label}
                maxLength={40}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                aria-label="New tracker name"
                ref={newTrackerRef}
              />
              <input
                type="text"
                inputMode="numeric"
                className="form-control form-control-sm input-theme sheet-tracker-add-total"
                value={draft.total}
                onChange={(e) => setDraft((d) => ({ ...d, total: Math.min(99, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0) }))}
                aria-label="Maximum uses"
              />
              <select
                className="form-select form-select-sm input-theme"
                value={draft.recharge}
                onChange={(e) => setDraft((d) => ({ ...d, recharge: e.target.value as CustomTracker['recharge'] }))}
                aria-label="Resets on"
              >
                {Object.entries(RECHARGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" className="sheet-btn" onClick={addCustom} disabled={!draft.label.trim() || draft.total < 1}>Add</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPanel;
