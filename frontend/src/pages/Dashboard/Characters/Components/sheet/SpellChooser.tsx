import { sigil } from '../../schoolSigil';
import React, { useContext, useMemo, useState } from 'react';
import SegmentedTabs from './SegmentedTabs';
import SpellBody from './SpellDetails';
import { NarrowContext } from '../../useNarrow';
import { CharacterSpell, SPELL_LEVEL_LABEL, Spell, SpellOrigin, slugify } from '../../spellTypes';
import { SpellSource, canChoose, sourceUsage } from '../../spellRules';

interface Props {
  source: SpellSource;
  /** Every spell the character has (all sources). */
  chosen: CharacterSpell[];
  catalog: Spell[];
  loading?: boolean;
  /** "Other" spells: the item they're being added from. */
  sourceRef?: SpellOrigin | null;
  onChange: (next: CharacterSpell[], label: string) => void;
}

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];

export const spellMeta = (s: Pick<Spell, 'school' | 'casting_time' | 'range' | 'concentration' | 'ritual'>) =>
  [s.school, s.casting_time, s.range].filter(Boolean).join(' · ');

/** "2/3" chips for a source's limits, shared by the chooser and the Spells tab. */
export const SourceCounts = ({ source, chosen }: { source: SpellSource; chosen: CharacterSpell[] }) => {
  const used = sourceUsage(source, chosen);
  if (source.unlimited) return null;
  const chip = (label: string, have: number, max: number) => (
    <span className={`sheet-count ${have > max ? 'is-over' : have === max ? 'is-full' : ''}`} title={have > max ? 'More than the usual limit' : undefined}>
      {label} <b>{have}/{max}</b>
    </span>
  );
  return (
    <span className="sheet-counts">
      {source.cantrips > 0 && chip('Cantrips', used.cantrips, source.cantrips)}
      {source.mode === 'known' && source.spells > 0 && chip('Known', used.spells, source.spells)}
      {source.mode === 'pick' && source.spells > 0 && chip('Spells', used.spells, source.spells)}
      {source.mode === 'spellbook' && chip('Spellbook', used.spells, source.spells)}
      {source.mode === 'spellbook' && chip('Prepared', used.prepared, source.prepares || 0)}
      {source.mode === 'prepared' && (source.prepares || 0) > 0 && chip('Prepared', used.spells, source.prepares || 0)}
    </span>
  );
};

// Choosing spells for one source: search, filter by level, tap to add or
// remove. Limits warn rather than block, because tables have their own rules.
const SpellChooser = ({ source, chosen, catalog, loading, sourceRef, onChange }: Props) => {
  const narrow = useContext(NarrowContext);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'all' | number>('all');
  const [anyList, setAnyList] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [custom, setCustom] = useState({ name: '', level: source.cantrips && !source.spells && !source.prepares ? 0 : Math.max(1, source.spellLevel || 1), school: '', casting_time: '1 action', range: '', duration: '', notes: '' });

  const mine = chosen.filter((c) => c.source === source.key);
  const mineSet = new Set(mine.map((c) => c.index));
  const elsewhere = new Map(chosen.filter((c) => c.source !== source.key).map((c) => [c.index, c.source]));
  const grantedSet = new Set(source.granted.map((g) => g.index));
  const levels = Array.from({ length: (source.unlimited ? 9 : source.maxLevel) + 1 }, (_, i) => i)
    .filter((l) => (l === 0 ? source.cantrips > 0 || source.unlimited : true) && (!source.spellLevel || l === 0 || l === source.spellLevel));

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((s) =>
      canChoose(source, s, anyList)
      && (level === 'all' || s.level === level)
      && (!q || s.name.toLowerCase().includes(q)));
  }, [catalog, source, anyList, level, query]);

  const toggle = (spell: Spell) => {
    if (mineSet.has(spell.index)) {
      onChange(chosen.filter((c) => !(c.source === source.key && c.index === spell.index)), `remove ${spell.name}`);
      return;
    }
    const prepared = source.mode === 'spellbook' && spell.level > 0
      ? sourceUsage(source, chosen).prepared < (source.prepares || 0)
      : undefined;
    onChange([...chosen, { index: spell.index, name: spell.name, level: spell.level, source: source.key, ...(prepared !== undefined ? { prepared } : {}), ...(sourceRef ? { source_ref: sourceRef } : {}) }], `add ${spell.name}`);
  };

  const addCustom = () => {
    const name = custom.name.trim();
    if (!name) return;
    onChange([...chosen, {
      index: `custom-${slugify(name)}-${Date.now().toString(36)}`,
      name,
      level: custom.level,
      source: source.key,
      ...(sourceRef ? { source_ref: sourceRef } : {}),
      custom: true,
      school: custom.school || undefined,
      casting_time: custom.casting_time || undefined,
      range: custom.range || undefined,
      duration: custom.duration || undefined,
      notes: custom.notes.trim() || undefined,
    }], `add ${name}`);
    setCustom({ ...custom, name: '', notes: '' });
    setWriting(false);
  };

  const listLabel = source.lists.length
    ? source.lists.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(' / ')
    : source.schools ? source.schools.join(' / ') : '';

  return (
    <div className="sheet-chooser">
      <div className="sheet-chooser-head">
        <SourceCounts source={source} chosen={chosen} />
        {source.hint && <span className="sheet-form-hint">{source.hint}</span>}
      </div>

      {source.granted.length > 0 && (
        <div className="sheet-granted">
          <span className="sheet-label">Always yours</span>
          {source.granted.map((g) => <span key={g.index} className="sheet-chip sheet-chip--granted" title={g.from}>{g.name}</span>)}
        </div>
      )}

      <div className="sheet-chooser-controls">
        <input
          className="form-control input-theme"
          placeholder="Search spells…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search spells"
        />
        {listLabel && !source.unlimited && (
          <label className="sheet-switch">
            <input type="checkbox" checked={anyList} onChange={(e) => setAnyList(e.target.checked)} />
            <span>Any class’s spells</span>
          </label>
        )}
      </div>
      {levels.length > 1 && (
        <SegmentedTabs
          options={[{ key: 'all', label: 'All' }, ...levels.map((l) => ({ key: String(l), label: SPELL_LEVEL_LABEL[l] }))]}
          value={String(level)}
          onChange={(k) => setLevel(k === 'all' ? 'all' : Number(k))}
          aria-label="Spell level"
        />
      )}

      <ul className="sheet-spell-options" aria-label={`Spells for ${source.label}`}>
        {loading && <li className="sheet-empty">Loading spells…</li>}
        {!loading && options.length === 0 && (
          <li className="sheet-empty">No spells match{listLabel && !anyList ? ` on the ${listLabel} list` : ''}. Try another level, or write your own below.</li>
        )}
        {options.map((s) => {
          const picked = mineSet.has(s.index);
          const isOpen = open === s.index;
          return (
            <li key={s.index} className={`sheet-spell-option ${picked ? 'is-picked' : ''} ${sigil(s.school).className}`} style={sigil(s.school).style}>
              <button
                type="button"
                className="sheet-spell-check"
                onClick={() => toggle(s)}
                aria-pressed={picked}
                aria-label={picked ? `Remove ${s.name}` : `Add ${s.name}`}
                disabled={grantedSet.has(s.index)}
              >
                <span className={`sheet-check-icon ${picked || grantedSet.has(s.index) ? 'is-check' : 'is-plus'}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="sheet-spell-option-main"
                onClick={() => (narrow && !grantedSet.has(s.index) ? toggle(s) : setOpen(isOpen ? null : s.index))}
                aria-expanded={narrow ? undefined : isOpen}
              >
                <span className="sheet-spell-option-name">
                  {s.name}
                  {s.concentration && <span className="sheet-tag" title="Concentration">C</span>}
                  {s.ritual && <span className="sheet-tag" title="Ritual">R</span>}
                  {grantedSet.has(s.index) && <span className="sheet-chip sheet-chip--granted">always</span>}
                  {elsewhere.has(s.index) && <span className="sheet-chip">also known</span>}
                </span>
                <span className="sheet-spell-option-meta">{SPELL_LEVEL_LABEL[s.level]} · {spellMeta(s)}</span>
              </button>
              {narrow && (
                <button
                  type="button"
                  className="sheet-spell-info"
                  onClick={() => setOpen(isOpen ? null : s.index)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${s.name}`}
                >
                  {isOpen ? '▴' : 'ⓘ'}
                </button>
              )}
              {isOpen && (
                <div className="sheet-spell-desc">
                  <SpellBody spell={s} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sheet-chooser-custom">
        {!writing ? (
          <button type="button" className="sheet-link" onClick={() => setWriting(true)}>+ Write your own spell</button>
        ) : (
          <div className="sheet-form">
            <div className="sheet-form-grid">
              <label className="sheet-form-row">
                <span className="sheet-label">Name</span>
                <input className="form-control input-theme" value={custom.name} maxLength={60} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">Level</span>
                <select className="form-select input-theme" value={custom.level} onChange={(e) => setCustom({ ...custom, level: Number(e.target.value) })}>
                  {SPELL_LEVEL_LABEL.map((l, i) => <option key={l} value={i}>{l}</option>)}
                </select>
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">School</span>
                <select className="form-select input-theme" value={custom.school} onChange={(e) => setCustom({ ...custom, school: e.target.value })}>
                  <option value="">—</option>
                  {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="sheet-form-grid">
              <label className="sheet-form-row">
                <span className="sheet-label">Casting time</span>
                <input className="form-control input-theme" value={custom.casting_time} maxLength={30} onChange={(e) => setCustom({ ...custom, casting_time: e.target.value })} />
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">Range</span>
                <input className="form-control input-theme" value={custom.range} maxLength={30} onChange={(e) => setCustom({ ...custom, range: e.target.value })} />
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">Duration</span>
                <input className="form-control input-theme" value={custom.duration} maxLength={30} onChange={(e) => setCustom({ ...custom, duration: e.target.value })} />
              </label>
            </div>
            <label className="sheet-form-row">
              <span className="sheet-label">What it does</span>
              <textarea className="form-control input-theme" rows={3} maxLength={1500} value={custom.notes} onChange={(e) => setCustom({ ...custom, notes: e.target.value })} />
            </label>
            <div className="d-flex gap-2">
              <button type="button" className="sheet-btn sheet-btn--primary" onClick={addCustom} disabled={!custom.name.trim()}>Add spell</button>
              <button type="button" className="sheet-btn" onClick={() => setWriting(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpellChooser;
