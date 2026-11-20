import React, { useContext, useMemo, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import SegmentedTabs from './SegmentedTabs';
import { NarrowContext } from '../../useNarrow';
import { useDockAction } from '../../dockAction';
import { FeatureOption, OPTION_GROUPS, OptionGroup, findOption, optionsIn } from '../../featureOptions';
import {
  CharacterChoice, ChoiceContext, ChoiceSlot, choicesFor, looseChoices, newChoiceId, prereqText, unmetPrereqs,
} from '../../featureChoices';
import '../../../../../styles/homebrew.css'; // theme-modal

interface Props {
  slots: ChoiceSlot[];
  choices: CharacterChoice[];
  context: ChoiceContext;
  isOwner: boolean;
  onChange: (choices: CharacterChoice[], label: string) => void;
}

const TIMING_LABEL = { action: 'Action', bonus: 'Bonus action', reaction: 'Reaction', special: 'Special' } as const;
const PICKABLE_GROUPS = (Object.keys(OPTION_GROUPS) as OptionGroup[]).filter((g) => g !== 'other');

/** Where a new pick goes: one of the character's menus, or the table's extras. */
interface Target {
  source: string;
  group: OptionGroup;
  /** The table's extras can be from any menu. */
  anyGroup: boolean;
  /** Fighting styles: this class's own styles come first. */
  classIndex?: string;
}

// ── Picker ───────────────────────────────────────────────────────────────────

const ChoiceDialog = ({ target, taken, context, onAdd, onClose }: {
  target: Target | null;
  taken: Set<string>;
  context: ChoiceContext;
  onAdd: (choice: CharacterChoice) => void;
  onClose: () => void;
}) => {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [group, setGroup] = useState<OptionGroup>('fighting-style');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<FeatureOption | null>(null);
  const [custom, setCustom] = useState({ name: '', desc: '' });

  React.useEffect(() => {
    if (!target) return;
    setMode('catalog'); setQuery(''); setPicked(null); setCustom({ name: '', desc: '' });
    setGroup(target.anyGroup ? 'fighting-style' : target.group);
  }, [target]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mine = (o: FeatureOption) => (target?.classIndex && o.classes?.includes(target.classIndex) ? 0 : 1);
    return optionsIn(group)
      .filter((o) => !q || o.name.toLowerCase().includes(q) || o.summary.toLowerCase().includes(q))
      .map((o) => ({ o, unmet: unmetPrereqs(o, context) }))
      // Ready to take first, then by the class's own list; the catalog order (A-Z) holds otherwise.
      .sort((a, b) => (a.unmet.length ? 1 : 0) - (b.unmet.length ? 1 : 0) || mine(a.o) - mine(b.o));
  }, [group, query, context, target]);

  if (!target) return null;
  const label = OPTION_GROUPS[target.anyGroup ? group : target.group].label.toLowerCase();
  const canAdd = mode === 'catalog' ? !!picked : !!custom.name.trim();

  const add = () => {
    if (mode === 'catalog' && picked) {
      onAdd({ id: newChoiceId(), group: picked.group, index: picked.index, name: picked.name, source: target.source });
    } else if (mode === 'custom') {
      onAdd({
        id: newChoiceId(),
        group: target.anyGroup ? 'other' : target.group,
        index: `custom-${Date.now().toString(36)}`,
        name: custom.name.trim(),
        desc: custom.desc.trim() || undefined,
        source: target.source,
      });
    }
  };

  return (
    <Modal isOpen toggle={onClose} centered size="lg" fullscreen="sm" scrollable contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>{target.anyGroup ? 'Add an option' : `Choose a ${label}`}</ModalHeader>
      <ModalBody>
        <div className="sheet-form">
          <SegmentedTabs
            options={[{ key: 'catalog', label: 'From the list' }, { key: 'custom', label: 'Write your own' }]}
            value={mode}
            onChange={setMode}
            aria-label="Option type"
          />

          {mode === 'catalog' ? (
            <>
              {target.anyGroup && (
                <SegmentedTabs
                  options={PICKABLE_GROUPS.map((g) => ({ key: g, label: OPTION_GROUPS[g].plural }))}
                  value={group}
                  onChange={(g) => { setGroup(g); setPicked(null); }}
                  aria-label="Kind of option"
                />
              )}
              <input
                className="form-control input-theme"
                placeholder={`Search ${OPTION_GROUPS[group].plural.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search options"
              />
              <div className="sheet-pick-list" role="listbox" aria-label={OPTION_GROUPS[group].plural}>
                {results.length === 0 && <p className="sheet-empty">Nothing matches. Try “Write your own”.</p>}
                {results.map(({ o, unmet }) => (
                  <button
                    key={o.index}
                    type="button"
                    role="option"
                    aria-selected={picked?.index === o.index}
                    className={`sheet-pick ${picked?.index === o.index ? 'is-picked' : ''}`}
                    onClick={() => setPicked(o)}
                  >
                    <span className="sheet-pick-name">
                      {o.name}
                      {taken.has(o.index) && <span className="sheet-chip">taken</span>}
                      {o.timing && <span className="sheet-chip">{TIMING_LABEL[o.timing]}</span>}
                      {unmet.length > 0 && <span className="sheet-chip sheet-chip--warn">needs {unmet.join(', ')}</span>}
                    </span>
                    <span className="sheet-pick-desc">{o.summary}</span>
                    {(o.cost || prereqText(o)) && (
                      <span className="sheet-pick-meta">
                        {[o.cost && `Costs ${o.cost.toLowerCase()}`, prereqText(o) && `Needs ${prereqText(o)}`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {picked && unmetPrereqs(picked, context).length > 0 && (
                <p className="sheet-form-hint">
                  {picked.name} normally needs {unmetPrereqs(picked, context).join(', ')}. You can still take it if your table allows.
                </p>
              )}
            </>
          ) : (
            <>
              <label className="sheet-form-row">
                <span className="sheet-label">Name</span>
                <input className="form-control input-theme" value={custom.name} maxLength={60} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">What it does</span>
                <textarea className="form-control input-theme" rows={4} maxLength={1500} value={custom.desc} onChange={(e) => setCustom({ ...custom, desc: e.target.value })} />
              </label>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-theme-primary" disabled={!canAdd} onClick={add}>Add</button>
      </ModalFooter>
    </Modal>
  );
};

// ── Panel ────────────────────────────────────────────────────────────────────

// Fighting styles, invocations, metamagic and the like: one section per menu
// the character's classes and feats open up, plus whatever the table adds.
const ChoicesPanel = ({ slots, choices, context, isOwner, onChange }: Props) => {
  const [target, setTarget] = useState<Target | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const narrow = useContext(NarrowContext);

  // Phones: the dock's button fills the first open pick, else adds an extra option.
  const firstOpen = slots.find((slot) => slot.total - choicesFor(slot, choices).length > 0);
  useDockAction(isOwner && narrow ? 'Add' : null, () => setTarget(
    firstOpen
      ? { source: firstOpen.source, group: firstOpen.group, anyGroup: false, classIndex: firstOpen.source.replace(/^class:/, '') }
      : { source: 'other', group: 'other', anyGroup: true },
  ));

  const taken = new Set(choices.map((c) => c.index));
  const loose = looseChoices(slots, choices);

  const remove = (c: CharacterChoice) => {
    onChange(choices.filter((x) => x.id !== c.id), `remove ${c.name}`);
    setOpen(null);
  };

  const list = (items: CharacterChoice[]) => (
    <ul className="sheet-feats">
      {items.map((c) => {
        const option = findOption(c.group, c.index);
        const isOpen = open === c.id;
        const unmet = option ? unmetPrereqs(option, context) : [];
        return (
          <li key={c.id} className="sheet-feat">
            <button type="button" className="sheet-feat-head" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}>
              <span className="sheet-feat-name">{c.name}</span>
              {option?.timing && <span className="sheet-chip">{TIMING_LABEL[option.timing]}</span>}
              {unmet.length > 0 && <span className="sheet-chip sheet-chip--warn">needs {unmet.join(', ')}</span>}
              <span className="sheet-feat-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="sheet-feat-body">
                <p>{c.desc || option?.summary || 'No description.'}</p>
                {option?.cost && <p className="sheet-form-hint">Costs {option.cost.toLowerCase()}.</p>}
                {option && prereqText(option) && <p className="sheet-form-hint">Needs {prereqText(option)}.</p>}
                {isOwner && (
                  <div className="sheet-feat-actions">
                    <span />
                    <button type="button" className="sheet-link sheet-link--danger" onClick={() => remove(c)}>Remove</button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="d-flex flex-column gap-3">
      {slots.length === 0 && loose.length === 0 && (
        <p className="sheet-empty">
          Nothing to choose yet. Fighting styles, invocations, metamagic, maneuvers and infusions show up here when a class or feat grants them.
        </p>
      )}

      {slots.map((slot) => {
        const mine = choicesFor(slot, choices);
        const left = slot.total - mine.length;
        const info = OPTION_GROUPS[slot.group];
        return (
          <div key={slot.key}>
            <div className="sheet-panel-head">
              <h4 className="sheet-section-title mb-0">
                {slot.total > 1 ? info.plural : info.label} · {slot.sourceLabel}
                <span className={`sheet-chip ms-2 ${left > 0 ? 'sheet-chip--level' : left < 0 ? 'sheet-chip--warn' : ''}`}>
                  {mine.length} / {slot.total}
                </span>
              </h4>
              {isOwner && (
                <button
                  type="button"
                  className={`sheet-btn ${left > 0 ? 'sheet-btn--primary' : ''}`}
                  onClick={() => setTarget({ source: slot.source, group: slot.group, anyGroup: false, classIndex: slot.source.replace(/^class:/, '') })}
                >
                  {left > 0 ? `+ Choose (${left} left)` : '+ Add'}
                </button>
              )}
            </div>
            {mine.length > 0 ? list(mine) : <p className="sheet-form-hint mt-2">None chosen yet.</p>}
          </div>
        );
      })}

      {(loose.length > 0 || isOwner) && (
        <div>
          <div className="sheet-panel-head">
            <h4 className="sheet-section-title mb-0">Other options</h4>
            {isOwner && (
              <button type="button" className="sheet-btn" onClick={() => setTarget({ source: 'other', group: 'other', anyGroup: true })}>
                + Add
              </button>
            )}
          </div>
          {loose.length > 0
            ? list(loose)
            : <p className="sheet-form-hint mt-2">Anything outside your class’s picks: a boon, a magic item’s trick, a house rule.</p>}
        </div>
      )}

      <ChoiceDialog
        target={target}
        taken={taken}
        context={context}
        onAdd={(choice) => { onChange([...choices, choice], `add ${choice.name}`); setTarget(null); }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
};

export default ChoicesPanel;
