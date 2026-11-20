import React, { useContext, useMemo, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import SegmentedTabs from './SegmentedTabs';
import {
  ACTION_KINDS, ActionKind, BASIC_ACTIONS, CAST_TIMES, CastTime, SheetAction, newActionId, timing,
} from '../../actionTypes';
import { SlotLevel } from '../../sheetRules';
import { freeSlotFor } from '../../spellRules';
import { SPELL_LEVEL_LABEL, Spell, useSpells } from '../../spellTypes';
import SpellBody from './SpellDetails';
import { sigil } from '../../schoolSigil';
import { NarrowContext } from '../../useNarrow';
import { useDockAction } from '../../dockAction';
import '../../../../../styles/homebrew.css'; // theme-modal

const getSourceLabel = (source: SheetAction['source']): string => {
  const labels: Record<Exclude<SheetAction['source'], undefined>, string> = {
    spell: 'Spell',
    choice: 'Feature',
    feat: 'Feat',
    item: 'Item',
    action: 'Action',
  };
  return source ? labels[source] : 'Custom';
};

type Filter = 'all' | 'action' | 'bonus' | 'reaction' | 'spell';

interface Props {
  actions: SheetAction[];
  /** Read-only rows from elsewhere on the sheet: ready spells ("spell:" ids) and class options ("choice:" ids). */
  linkedSpells?: SheetAction[];
  slots: SlotLevel[];
  isOwner: boolean;
  onChange: (actions: SheetAction[], label: string) => void;
  /** Spends a slot of this level; the panel only offers it when one is free. */
  onCast: (slotKey: string, spellName: string) => void;
}

interface ActionDetail {
  action: SheetAction;
  source?: string;
}

const ORDINAL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const KIND_LABEL = Object.fromEntries(ACTION_KINDS.map((k) => [k.key, k.label])) as Record<ActionKind, string>;
const TIMING_LABEL: Record<CastTime, string> = { action: 'Action', bonus: 'Bonus', reaction: 'Reaction', other: 'Other' };

const blank = (kind: ActionKind): SheetAction => ({
  id: newActionId(), name: '', kind, ...(kind === 'spell' ? { spell_level: 1, cast_time: 'action' as CastTime } : {}),
});

/** Comes from another tab, so it's edited there. */
const isLinked = (a: SheetAction) => a.id.startsWith('spell:') || a.id.startsWith('choice:') || a.id.startsWith('mined:');

const matches = (a: SheetAction, f: Filter) =>
  f === 'all' || (f === 'spell' ? a.kind === 'spell' : timing(a) === f);

const matchesSearch = (a: SheetAction, q: string) => {
  if (!q) return true;
  const lower = q.toLowerCase();
  return a.name.toLowerCase().includes(lower)
    || a.notes?.toLowerCase().includes(lower)
    || a.description?.toLowerCase().includes(lower)
    || a.attack?.toLowerCase().includes(lower)
    || a.damage?.toLowerCase().includes(lower);
};

// ── Detail modal ─────────────────────────────────────────────────────────────

const ActionDetailModal = ({ detail, slots, isOwner, onCast, onClose }: {
  detail: ActionDetail | null;
  slots: SlotLevel[];
  isOwner: boolean;
  onCast: (slotKey: string, spellName: string) => void;
  onClose: () => void;
}) => {
  const { spells: catalog } = useSpells();
  if (!detail) return null;
  const a = detail.action;
  const isSpell = a.kind === 'spell';
  const index = a.id.startsWith('spell:') ? a.id.slice('spell:'.length) : '';
  const spell: Spell | undefined = isSpell
    ? catalog.find((s) => s.index === index) || catalog.find((s) => s.name.toLowerCase() === a.name.toLowerCase())
    : undefined;
  const level = a.spell_level ?? 0;
  const slot = isSpell && level > 0 ? freeSlotFor(slots, level) : undefined;
  const hasText = !!(a.description || a.notes);

  return (
    <Modal isOpen toggle={onClose} centered size="lg" fullscreen="sm" scrollable contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>{a.name}</ModalHeader>
      <ModalBody>
        <div className={`sheet ${isSpell ? sigil(spell?.school || a.school, true).className : ''}`} style={isSpell ? sigil(spell?.school || a.school, true).style : undefined}>
          <div className="sheet-spell-tags">
            {isSpell ? (
              <>
                <span className="sheet-chip sheet-chip--level">{level === 0 ? 'Cantrip' : `${SPELL_LEVEL_LABEL[level]} level`}</span>
                {spell?.school && <span className="sheet-chip">{spell.school}</span>}
                {spell?.concentration && <span className="sheet-chip">Concentration</span>}
                {spell?.ritual && <span className="sheet-chip">Ritual</span>}
              </>
            ) : (
              <span className="sheet-chip sheet-chip--level">{KIND_LABEL[a.kind]}</span>
            )}
            {a.tag && <span className="sheet-chip sheet-chip--granted">{a.tag}</span>}
            {detail.source && <span className="sheet-chip">{detail.source}</span>}
          </div>

          {isSpell ? (
            <SpellBody spell={spell} notes={a.notes || a.description} />
          ) : (
            <>
              {(a.attack || a.damage || a.range) && (
                <dl className="sheet-spell-facts">
                  {a.attack && <div><dt>To hit / DC</dt><dd>{a.attack}</dd></div>}
                  {a.damage && <div><dt>Damage / effect</dt><dd>{a.damage}</dd></div>}
                  {a.range && <div><dt>Range</dt><dd>{a.range}</dd></div>}
                  {a.cost && <div><dt>Cost</dt><dd>{a.cost}</dd></div>}
                </dl>
              )}
              {!(a.attack || a.damage || a.range) && a.cost && (
                <dl className="sheet-spell-facts"><div><dt>Cost</dt><dd>{a.cost}</dd></div></dl>
              )}
              {hasText ? (
                <div className="sheet-spell-text" style={{ whiteSpace: 'pre-line' }}>
                  <p>{a.description || a.notes}</p>
                  {a.description && a.notes && !a.description.includes(a.notes) && !a.notes.includes(a.description) && <p>{a.notes}</p>}
                </div>
              ) : (
                <p className="sheet-spell-text">No description yet. Edit this action to add notes.</p>
              )}
            </>
          )}
        </div>
      </ModalBody>
      {isOwner && isSpell && level > 0 && (
        <ModalFooter>
          {slot ? (
            <button type="button" className="btn btn-theme-primary w-100" onClick={() => { onCast(slot.key, a.name); onClose(); }}>
              Cast with a {slot.label} slot
            </button>
          ) : (
            <span className="sheet-chip sheet-chip--warn" role="status">No slots left to cast this</span>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
};

// ── Editor ───────────────────────────────────────────────────────────────────

const ActionEditor = ({ draft, isNew, onSave, onDelete, onClose }: {
  draft: SheetAction | null;
  isNew: boolean;
  onSave: (a: SheetAction) => void;
  onDelete: (a: SheetAction) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<SheetAction | null>(draft);
  React.useEffect(() => setForm(draft), [draft]);
  if (!form) return null;
  const set = (patch: Partial<SheetAction>) => setForm({ ...form, ...patch });
  const isSpell = form.kind === 'spell';

  return (
    // autoFocus off so the Name field (not the dialog) takes focus.
    <Modal isOpen={!!draft} toggle={onClose} centered fullscreen="sm" scrollable autoFocus={false} contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>{isNew ? 'Add to your turn' : `Edit ${draft?.name}`}</ModalHeader>
      <ModalBody>
        <div className="sheet-form">
          <label className="sheet-form-row">
            <span className="sheet-label">Name</span>
            <input
              className="form-control input-theme"
              value={form.name}
              maxLength={60}
              autoFocus
              placeholder={isSpell ? 'e.g. Shield' : 'e.g. Longsword'}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>

          <div className="sheet-form-row">
            <span className="sheet-label">Type</span>
            <SegmentedTabs
              options={ACTION_KINDS.map((k) => ({ key: k.key, label: k.label }))}
              value={form.kind}
              onChange={(kind) => set(kind === 'spell'
                ? { kind, spell_level: form.spell_level ?? 1, cast_time: form.cast_time || 'action' }
                : { kind, spell_level: undefined, cast_time: undefined })}
              aria-label="Type"
            />
          </div>

          {isSpell && (
            <div className="sheet-form-grid">
              <label className="sheet-form-row">
                <span className="sheet-label">Spell level</span>
                <select className="form-select input-theme" value={form.spell_level ?? 0} onChange={(e) => set({ spell_level: Number(e.target.value) })}>
                  {ORDINAL.map((o, i) => <option key={o} value={i}>{o}</option>)}
                </select>
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">Casting time</span>
                <select className="form-select input-theme" value={form.cast_time || 'action'} onChange={(e) => set({ cast_time: e.target.value as CastTime })}>
                  {CAST_TIMES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </label>
            </div>
          )}

          <div className="sheet-form-grid sheet-form-grid--3">
            <label className="sheet-form-row">
              <span className="sheet-label">To hit / DC</span>
              <input className="form-control input-theme" value={form.attack || ''} maxLength={20} placeholder="+5 or DC 14" onChange={(e) => set({ attack: e.target.value })} />
            </label>
            <label className="sheet-form-row">
              <span className="sheet-label">Damage / effect</span>
              <input className="form-control input-theme" value={form.damage || ''} maxLength={40} placeholder="1d8+3 slashing" onChange={(e) => set({ damage: e.target.value })} />
            </label>
            <label className="sheet-form-row">
              <span className="sheet-label">Range</span>
              <input className="form-control input-theme" value={form.range || ''} maxLength={20} placeholder="5 ft" onChange={(e) => set({ range: e.target.value })} />
            </label>
          </div>

          <label className="sheet-form-row">
            <span className="sheet-label">Notes</span>
            <textarea className="form-control input-theme" rows={3} value={form.notes || ''} maxLength={1000} placeholder="Properties, conditions, components, how your table rules it…" onChange={(e) => set({ notes: e.target.value })} />
          </label>
        </div>
      </ModalBody>
      <ModalFooter className="sheet-dialog-footer">
        {!isNew && (
          <button type="button" className="btn btn-outline-danger me-auto" onClick={() => onDelete(form)}>Remove</button>
        )}
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-theme-primary" disabled={!form.name.trim()} onClick={() => onSave({ ...form, name: form.name.trim() })}>
          {isNew ? 'Add' : 'Save'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

// ── Panel ────────────────────────────────────────────────────────────────────

const ActionsPanel = ({ actions, linkedSpells = [], slots, isOwner, onChange, onCast }: Props) => {
  const narrow = useContext(NarrowContext);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ action: SheetAction; isNew: boolean } | null>(null);
  const [detail, setDetail] = useState<ActionDetail | null>(null);
  const [showBasics, setShowBasics] = useState(false);

  const everything = useMemo(() => [...actions, ...linkedSpells], [actions, linkedSpells]);
  const count = (f: Filter) => everything.filter((a) => matches(a, f)).length;
  const shown = useMemo(() => everything
    .filter((a) => matches(a, filter) && matchesSearch(a, search))
    .sort((a, b) => (a.kind === 'spell' && b.kind === 'spell' ? (a.spell_level ?? 0) - (b.spell_level ?? 0) : 0)),
    [everything, filter, search]);
  const basics = BASIC_ACTIONS.filter((b) => (filter === 'all' || b.kind === filter) && matchesSearch({ name: b.name, notes: b.summary } as SheetAction, search));

  const save = (a: SheetAction) => {
    const exists = actions.some((x) => x.id === a.id);
    onChange(exists ? actions.map((x) => (x.id === a.id ? a : x)) : [...actions, a], exists ? a.name : `add ${a.name}`);
    setEditing(null);
  };

  const remove = (a: SheetAction) => {
    onChange(actions.filter((x) => x.id !== a.id), `remove ${a.name}`);
    setEditing(null);
  };

  // On phones the add button lives in the dock beside undo / redo.
  useDockAction(isOwner && narrow ? 'Add' : null, () => setEditing({ action: blank(filter === 'all' ? 'action' : filter), isNew: true }));

  const freeSlot = (level: number) => freeSlotFor(slots, level);
  const openDetail = (a: SheetAction) => setDetail({ action: a, source: a.source ? getSourceLabel(a.source) : undefined });

  return (
    <div className="d-flex flex-column gap-3">
      <div className="sheet-panel-head">
        <SegmentedTabs
          options={[
            { key: 'all', label: 'All', count: count('all') },
            { key: 'action', label: 'Actions', count: count('action') },
            { key: 'bonus', label: 'Bonus', count: count('bonus') },
            { key: 'reaction', label: 'Reactions', count: count('reaction') },
            { key: 'spell', label: 'Spells', count: count('spell') },
          ]}
          value={filter}
          onChange={setFilter}
          aria-label="Filter actions"
        />
        {isOwner && !narrow && (
          <button
            type="button"
            className="sheet-btn sheet-btn--primary"
            onClick={() => setEditing({ action: blank(filter === 'all' ? 'action' : filter), isNew: true })}
          >
            + Add
          </button>
        )}
      </div>

      {count('all') > 0 && (
        <input
          className="form-control input-theme"
          placeholder="Search by name, notes, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search actions"
        />
      )}

      {shown.length === 0 ? (
        <p className="sheet-empty">
          {filter === 'spell' ? 'No spells yet.' : 'Nothing here yet.'}
          {isOwner && ' Add your weapons, spells and tricks so they’re one tap away during play.'}
        </p>
      ) : (
        <ul className="sheet-actions">
          {shown.map((a) => {
            const slot = a.kind === 'spell' && (a.spell_level ?? 0) > 0 ? freeSlot(a.spell_level!) : undefined;
            return (
              <li key={a.id} className={`sheet-action ${a.kind === 'spell' ? sigil(a.school).className : ''}`} style={a.kind === 'spell' ? sigil(a.school).style : undefined}>
                <span className={`sheet-action-kind is-${timing(a)}`} title={KIND_LABEL[a.kind]}>
                  {a.kind === 'spell' ? (a.spell_level ? a.spell_level : 'C') : ACTION_KINDS.find((k) => k.key === a.kind)?.short}
                </span>
                <div
                  className="sheet-action-main sheet-action-main--tap"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(a)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(a); } }}
                  aria-label={`${a.name}: view details`}
                >
                  <div className="sheet-action-name">
                    {a.name}
                    {a.tag && <span className="sheet-chip sheet-chip--granted" title="From the Features tab">{a.tag}</span>}
                    {a.kind === 'spell' && (
                      <span className="sheet-action-sub">
                        {ORDINAL[a.spell_level ?? 0]}{(a.spell_level ?? 0) > 0 ? ' level' : ''} · {TIMING_LABEL[timing(a)]}
                      </span>
                    )}
                  </div>
                  {(a.attack || a.damage || a.range) && (
                    <div className="sheet-action-stats">
                      {a.attack && <span><b>{a.attack}</b></span>}
                      {a.damage && <span>{a.damage}</span>}
                      {a.range && <span className="text-muted-theme">{a.range}</span>}
                      {a.source && <span className="sheet-chip" title={`From ${getSourceLabel(a.source)}`}>{getSourceLabel(a.source)}</span>}
                      {a.id.startsWith('spell:') && <span className="sheet-chip" title="From the Spells tab">spellbook</span>}
                    </div>
                  )}
                  {a.notes && <p className="sheet-action-notes">{a.notes}</p>}
                </div>
                <div className="sheet-action-buttons">
                  <span className="sheet-action-more" aria-hidden="true">›</span>
                  {isOwner && a.kind === 'spell' && (a.spell_level ?? 0) > 0 && (slot ? (
                    <button
                      type="button"
                      className="sheet-btn"
                      onClick={() => onCast(slot.key, a.name)}
                      title={`Spend a ${slot.label} slot`}
                    >
                      Cast
                    </button>
                  ) : (
                    <span className="sheet-chip sheet-chip--warn" role="status">No slots left</span>
                  ))}
                  {isOwner && !isLinked(a) && (
                    <button type="button" className="sheet-icon-btn" onClick={() => setEditing({ action: a, isNew: false })} aria-label={`Edit ${a.name}`}>
                      ✎
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filter !== 'spell' && basics.length > 0 && (
        <div className="sheet-basics">
          <button type="button" className="sheet-basics-toggle" onClick={() => setShowBasics((s) => !s)} aria-expanded={showBasics}>
            <span>{showBasics ? '▾' : '▸'}</span> Basic {filter === 'all' ? 'actions everyone has' : `${TIMING_LABEL[filter as CastTime].toLowerCase()}s everyone has`}
            <span className="sheet-segment-count">{basics.length}</span>
          </button>
          {showBasics && (
            <ul className="sheet-basics-list">
              {basics.map((b) => (
                <li key={b.name}>
                  <span className={`sheet-action-kind is-${b.kind}`}>{ACTION_KINDS.find((k) => k.key === b.kind)?.short}</span>
                  <div>
                    <strong>{b.name}</strong>
                    <p>{b.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ActionDetailModal detail={detail} slots={slots} isOwner={isOwner} onCast={onCast} onClose={() => setDetail(null)} />

      <ActionEditor
        draft={editing?.action || null}
        isNew={!!editing?.isNew}
        onSave={save}
        onDelete={remove}
        onClose={() => setEditing(null)}
      />
    </div>
  );
};

export default ActionsPanel;
