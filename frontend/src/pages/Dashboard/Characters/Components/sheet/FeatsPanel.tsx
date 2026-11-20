import React, { useContext, useMemo, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import SegmentedTabs from './SegmentedTabs';
import { CharacterFeat, FEAT_SOURCES, Feat, FeatSource, featSource, useFeats } from '../../featTypes';
import { ABILITY_SHORT, AbilityKey } from '../../sheetRules';
import { ABILITY_INDEX_TO_KEY } from '../../classTypes';
import { NarrowContext } from '../../useNarrow';
import { useDockAction } from '../../dockAction';
import '../../../../../styles/homebrew.css'; // theme-modal

type Filter = 'all' | FeatSource;

interface Props {
  feats: CharacterFeat[];
  isOwner: boolean;
  /** Adds the feat (and its +1, if it raises an ability). */
  onAdd: (feat: CharacterFeat) => void;
  /** Removes the feat at this position (and takes its +1 back). */
  onRemove: (index: number) => void;
  onUpdate: (index: number, feat: CharacterFeat) => void;
}

const SOURCE_LABEL = Object.fromEntries(FEAT_SOURCES.map((s) => [s.key, s.label])) as Record<FeatSource, string>;
const abilityShort = (code?: string) => {
  const key = code ? (ABILITY_INDEX_TO_KEY[code] as AbilityKey | undefined) : undefined;
  return key ? ABILITY_SHORT[key] : code?.toUpperCase();
};

// ── Add dialog ───────────────────────────────────────────────────────────────

const AddFeatDialog = ({ isOpen, defaultSource, owned, onAdd, onClose }: {
  isOpen: boolean;
  defaultSource: FeatSource;
  owned: Set<string>;
  onAdd: (feat: CharacterFeat) => void;
  onClose: () => void;
}) => {
  const { feats: catalog, loading } = useFeats();
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Feat | null>(null);
  const [ability, setAbility] = useState('');
  const [source, setSource] = useState<FeatSource>(defaultSource);
  const [custom, setCustom] = useState({ name: '', desc: '', ability: '' });

  React.useEffect(() => {
    if (!isOpen) return;
    setMode('catalog'); setQuery(''); setPicked(null); setAbility(''); setSource(defaultSource);
    setCustom({ name: '', desc: '', ability: '' });
  }, [isOpen, defaultSource]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((f) => !q || f.name.toLowerCase().includes(q)).slice(0, 60);
  }, [catalog, query]);

  const needsAbility = !!picked && picked.ability_options.length > 1;
  const canAdd = mode === 'catalog' ? !!picked && (!needsAbility || !!ability) : !!custom.name.trim();

  const add = () => {
    if (mode === 'catalog' && picked) {
      onAdd({
        index: picked.index,
        name: picked.name,
        ability: (picked.ability_options.length === 1 ? picked.ability_options[0] : ability) || undefined,
        source,
      });
    } else if (mode === 'custom') {
      onAdd({
        index: `custom-${Date.now().toString(36)}`,
        name: custom.name.trim(),
        desc: custom.desc.trim() || undefined,
        ability: custom.ability || undefined,
        source,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered size="lg" fullscreen="sm" scrollable contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>Add a feat</ModalHeader>
      <ModalBody>
        <div className="sheet-form">
          <SegmentedTabs
            options={[{ key: 'catalog', label: 'From the list' }, { key: 'custom', label: 'Write your own' }]}
            value={mode}
            onChange={setMode}
            aria-label="Feat type"
          />

          {mode === 'catalog' ? (
            <>
              <input
                className="form-control input-theme"
                placeholder="Search feats…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search feats"
              />
              <div className="sheet-pick-list" role="listbox" aria-label="Feats">
                {loading && <p className="sheet-empty">Loading feats…</p>}
                {!loading && results.length === 0 && <p className="sheet-empty">No feats match. Try “Write your own”.</p>}
                {results.map((f) => (
                  <button
                    key={f.index}
                    type="button"
                    role="option"
                    aria-selected={picked?.index === f.index}
                    className={`sheet-pick ${picked?.index === f.index ? 'is-picked' : ''}`}
                    onClick={() => { setPicked(f); setAbility(''); }}
                  >
                    <span className="sheet-pick-name">
                      {f.name}
                      {owned.has(f.index) && <span className="sheet-chip">taken</span>}
                    </span>
                    {f.prerequisite && <span className="sheet-pick-meta">Needs {f.prerequisite}</span>}
                    {picked?.index === f.index && f.desc[0] && <span className="sheet-pick-desc">{f.desc[0]}</span>}
                  </button>
                ))}
              </div>
              {needsAbility && (
                <div className="sheet-form-row">
                  <span className="sheet-label">+{picked!.ability_bonus || 1} to</span>
                  <SegmentedTabs
                    options={picked!.ability_options.map((a) => ({ key: a, label: abilityShort(a) || a }))}
                    value={ability}
                    onChange={setAbility}
                    aria-label="Ability to raise"
                  />
                </div>
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
              <label className="sheet-form-row">
                <span className="sheet-label">Raises an ability by 1 (optional)</span>
                <select className="form-select input-theme" value={custom.ability} onChange={(e) => setCustom({ ...custom, ability: e.target.value })}>
                  <option value="">No ability increase</option>
                  {Object.entries(ABILITY_INDEX_TO_KEY).map(([code, key]) => (
                    <option key={code} value={code}>{ABILITY_SHORT[key as AbilityKey]}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="sheet-form-row">
            <span className="sheet-label">Where it came from</span>
            <SegmentedTabs
              options={FEAT_SOURCES.map((s) => ({ key: s.key, label: s.label }))}
              value={source}
              onChange={setSource}
              aria-label="Feat source"
            />
            <span className="sheet-form-hint">{FEAT_SOURCES.find((s) => s.key === source)?.hint}</span>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-theme-primary" disabled={!canAdd} onClick={add}>Add feat</button>
      </ModalFooter>
    </Modal>
  );
};

// ── Panel ────────────────────────────────────────────────────────────────────

const FeatsPanel = ({ feats, isOwner, onAdd, onRemove, onUpdate }: Props) => {
  const { feats: catalog } = useFeats();
  const narrow = useContext(NarrowContext);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useDockAction(isOwner && narrow ? 'Add' : null, () => setAdding(true));

  const q = search.trim().toLowerCase();
  const matchesSearch = (f: { name: string; desc?: string }) => !q || f.name.toLowerCase().includes(q) || f.desc?.toLowerCase().includes(q);

  const rows = feats.map((f, i) => ({ f, i, source: featSource(f) }));
  const shown = rows.filter((r) => (filter === 'all' || r.source === filter) && matchesSearch(r.f));
  const owned = new Set(feats.map((f) => f.index));

  return (
    <div className="d-flex flex-column gap-3">
      <div className="sheet-panel-head">
        <SegmentedTabs
          options={[
            { key: 'all', label: 'All', count: rows.length },
            ...FEAT_SOURCES.map((s) => ({ key: s.key, label: s.label, count: rows.filter((r) => r.source === s.key).length })),
          ]}
          value={filter}
          onChange={setFilter}
          aria-label="Filter feats by source"
        />
        {isOwner && !narrow && <button type="button" className="sheet-btn sheet-btn--primary" onClick={() => setAdding(true)}>+ Add feat</button>}
      </div>

      {rows.length > 5 && (
        <input
          className="form-control input-theme"
          placeholder="Search feats by name or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search feats"
        />
      )}

      {shown.length === 0 ? (
        <p className="sheet-empty">
          {filter === 'all' ? 'No feats yet.' : `No ${SOURCE_LABEL[filter as FeatSource].toLowerCase()} feats.`}
          {isOwner && ' Add one from the list or write your table’s own.'}
        </p>
      ) : (
        <ul className="sheet-feats">
          {shown.map(({ f, i, source }) => {
            const info = catalog.find((c) => c.index === f.index);
            const desc = f.desc ? [f.desc] : info?.desc || [];
            const isOpen = open === i;
            return (
              <li key={`${f.index}-${i}`} className="sheet-feat">
                <button type="button" className="sheet-feat-head" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                  <span className="sheet-feat-name">{f.name}</span>
                  {f.ability && <span className="sheet-chip">+1 {abilityShort(f.ability)}</span>}
                  <span className={`sheet-chip sheet-chip--${source}`}>{SOURCE_LABEL[source]}{f.taken_at ? ` · ${f.taken_at}` : ''}</span>
                  <span className="sheet-feat-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="sheet-feat-body">
                    {info?.prerequisite && <p className="sheet-form-hint">Prerequisite: {info.prerequisite}</p>}
                    {desc.length ? desc.map((d, n) => <p key={n}>{d}</p>) : <p className="sheet-form-hint">No description.</p>}
                    {isOwner && (
                      <div className="sheet-feat-actions">
                        <SegmentedTabs
                          options={FEAT_SOURCES.map((s) => ({ key: s.key, label: s.label }))}
                          value={source}
                          onChange={(next) => onUpdate(i, { ...f, source: next })}
                          aria-label={`${f.name} counts as`}
                        />
                        <button type="button" className="sheet-link sheet-link--danger" onClick={() => { onRemove(i); setOpen(null); }}>
                          Remove{f.ability ? ` (and its +1 ${abilityShort(f.ability)})` : ''}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddFeatDialog
        isOpen={adding}
        defaultSource={filter === 'all' ? 'other' : filter}
        owned={owned}
        onAdd={(feat) => { onAdd(feat); setAdding(false); }}
        onClose={() => setAdding(false)}
      />
    </div>
  );
};

export default FeatsPanel;
