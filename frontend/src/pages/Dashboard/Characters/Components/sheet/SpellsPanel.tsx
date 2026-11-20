import React, { useContext, useMemo, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import SegmentedTabs from './SegmentedTabs';
import SpellChooser, { SourceCounts, spellMeta } from './SpellChooser';
import { OverridableNumber } from './fields';
import { CharacterSpell, SPELL_LEVEL_LABEL, Spell, SpellOrigin, useSpells } from '../../spellTypes';
import { SpellSource, freeSlotFor, isReady } from '../../spellRules';
import { ABILITY_SHORT, Overrides, SlotLevel } from '../../sheetRules';
import { NarrowContext } from '../../useNarrow';
import { useDockAction } from '../../dockAction';
import SpellOriginDialog from './SpellOriginDialog';
import SpellBody from './SpellDetails';
import { sigil } from '../../schoolSigil';
import '../../../../../styles/homebrew.css'; // theme-modal

interface Props {
  characterId: string;
  campaignId: string | null;
  campaignName?: string;
  /** The user is the campaign's DM. */
  isDm: boolean;
  sources: SpellSource[];
  spells: CharacterSpell[];
  slots: SlotLevel[];
  overrides: Overrides;
  isOwner: boolean;
  onChange: (spells: CharacterSpell[], label: string) => void;
  onCast: (slotKey: string, spellName: string) => void;
  onOverride: (key: string, value: number | null, label: string) => void;
}

/** A spell row's details, from the reference list or the player's own entry. */
interface Row {
  key: string;
  name: string;
  level: number;
  granted?: string; // who grants it
  chosen?: CharacterSpell;
  ref?: Spell;
}

const findRef = (catalog: Spell[], index: string, name: string) =>
  catalog.find((s) => s.index === index) || catalog.find((s) => s.name.toLowerCase() === name.toLowerCase());

const SpellRow = ({ row, source, slots, isOwner, onRemove, onPrepare, onCast }: {
  row: Row;
  source: SpellSource;
  slots: SlotLevel[];
  isOwner: boolean;
  onRemove: () => void;
  onPrepare: (prepared: boolean) => void;
  onCast: (slot: SlotLevel) => void;
}) => {
  const [open, setOpen] = useState(false);
  const narrow = useContext(NarrowContext);
  const { ref, chosen } = row;
  const school = ref?.school || chosen?.school;
  const meta = ref ? spellMeta(ref) : [chosen?.school, chosen?.casting_time, chosen?.range].filter(Boolean).join(' · ');
  const ready = row.granted || !chosen || isReady(source, chosen);
  const slot = row.level > 0 && ready ? freeSlotFor(slots, row.level) : undefined;

  return (
    <li className={`sheet-spell ${ready ? '' : 'is-unprepared'} ${sigil(school).className}`} style={sigil(school).style}>
      <div className="sheet-spell-head">
        {source.mode === 'spellbook' && chosen && row.level > 0 && (
          <button
            type="button"
            className={`sheet-prepare ${chosen.prepared ? 'is-on' : ''}`}
            onClick={() => onPrepare(!chosen.prepared)}
            disabled={!isOwner}
            aria-pressed={!!chosen.prepared}
            title={chosen.prepared ? 'Prepared: tap to unprepare' : 'In your spellbook: tap to prepare'}
            aria-label={`${chosen.prepared ? 'Unprepare' : 'Prepare'} ${row.name}`}
          />
        )}
        <button type="button" className="sheet-spell-main" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="sheet-spell-name">
            {row.name}
            {ref?.concentration && <span className="sheet-tag" title="Concentration">C</span>}
            {ref?.ritual && <span className="sheet-tag" title="Ritual">R</span>}
            {row.granted && <span className="sheet-chip sheet-chip--granted" title={row.granted}>always</span>}
            {chosen?.source_ref && <span className="sheet-chip sheet-chip--granted" title={`From ${chosen.source_ref.name}`}>{chosen.source_ref.name}</span>}
            {chosen?.custom && <span className="sheet-chip">yours</span>}
            {!ref && !chosen?.custom && <span className="sheet-chip" title="Not in the free rules: add details in Notes">name only</span>}
          </span>
          {meta && <span className="sheet-spell-meta">{meta}</span>}
        </button>
        {isOwner && row.level > 0 && ready && (slot ? (
          <button
            type="button"
            className="sheet-btn"
            onClick={() => onCast(slot)}
            title={`Spend a ${slot.label} slot`}
          >
            Cast{slot.slotLevel > row.level ? ` (${SPELL_LEVEL_LABEL[slot.slotLevel]})` : ''}
          </button>
        ) : (
          <span className="sheet-chip sheet-chip--warn" role="status" title="Rest to get slots back, or restore one in Resources">No slots</span>
        ))}
        {isOwner && chosen && (
          <button type="button" className="sheet-icon-btn" onClick={onRemove} aria-label={`Remove ${row.name}`}>×</button>
        )}
      </div>
      {open && !narrow && (
        <div className="sheet-spell-desc">
          <SpellBody spell={row.ref} notes={row.chosen?.notes} />
        </div>
      )}
      {narrow && (
        <Modal isOpen={open} toggle={() => setOpen(false)} centered scrollable fullscreen="sm" contentClassName="theme-modal">
          <ModalHeader toggle={() => setOpen(false)}>{row.name}</ModalHeader>
          <ModalBody>
            <div className={`sheet ${sigil(school, true).className}`} style={sigil(school, true).style}>
              <div className="sheet-spell-tags">
                <span className="sheet-chip sheet-chip--level">
                  {row.level === 0 ? 'Cantrip' : `${SPELL_LEVEL_LABEL[row.level]} level`}
                </span>
                {(ref?.school || chosen?.school) && <span className="sheet-chip">{ref?.school || chosen?.school}</span>}
                {ref?.concentration && <span className="sheet-chip">Concentration</span>}
                {ref?.ritual && <span className="sheet-chip">Ritual</span>}
                <span className="sheet-chip sheet-chip--granted">{row.granted ? `${source.label} · ${row.granted}` : chosen?.source_ref ? `${source.label} · ${chosen.source_ref.name}` : source.label}</span>
              </div>
              <SpellBody spell={row.ref} notes={row.chosen?.notes} />
            </div>
          </ModalBody>
          {isOwner && row.level > 0 && ready && (
            <ModalFooter>
              {slot ? (
                <button type="button" className="btn btn-theme-primary w-100" onClick={() => { onCast(slot); setOpen(false); }}>
                  Cast with a {slot.label} slot
                </button>
              ) : (
                <span className="sheet-chip sheet-chip--warn" role="status">No slots left to cast this</span>
              )}
            </ModalFooter>
          )}
        </Modal>
      )}
    </li>
  );
};

// The spellbook: one card per source of spells (class, race, feats, other),
// each with its numbers, its spells by level, and a chooser.
const SpellsPanel = ({ characterId, campaignId, campaignName, isDm, sources, spells, slots, overrides, isOwner, onChange, onCast, onOverride }: Props) => {
  const { spells: catalog, loading } = useSpells();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState<SpellSource | null>(null);
  const narrow = useContext(NarrowContext);
  const [askingItem, setAskingItem] = useState(false);
  const [origin, setOrigin] = useState<SpellOrigin | null>(null);

  // "Other" spells come from somewhere, so ask which item first.
  const startChoosing = (src: SpellSource) => {
    setOrigin(null);
    if (src.key === 'other') setAskingItem(true); else setChoosing(src);
  };

  // Phones: the dock's Add asks where the spells come from (class, race, feat,
  // other) before opening the chooser; with only one possible source it skips the question.
  const [askingSource, setAskingSource] = useState(false);
  const canPick = (src: SpellSource) => src.unlimited || src.cantrips > 0 || src.spells > 0 || (src.prepares || 0) > 0;
  const pickable = sources.filter(canPick);
  const addSpells = () => (pickable.length === 1 ? startChoosing(pickable[0]) : setAskingSource(true));
  useDockAction(isOwner && narrow && pickable.length > 0 ? 'Add' : null, addSpells);
  const [adjusting, setAdjusting] = useState(false);

  const visible = sources.filter((s) =>
    (filter === 'all' || s.key === filter)
    && (s.key !== 'other' || filter === 'other' || spells.some((c) => c.source === 'other')));

  const rowsFor = useMemo(() => (source: SpellSource): Row[] => {
    const q = search.trim().toLowerCase();
    const granted: Row[] = source.granted.map((g) => {
      const ref = findRef(catalog, g.index, g.name);
      return { key: `g-${g.index}`, name: ref?.name || g.name, level: ref?.level ?? 0, granted: g.from, ref };
    });
    const chosen: Row[] = spells
      .filter((c) => c.source === source.key)
      .map((c) => ({ key: c.index, name: c.name, level: c.level, chosen: c, ref: c.custom ? undefined : findRef(catalog, c.index, c.name) }));
    const all = [...granted, ...chosen];
    if (q) {
      return all.filter((r) => r.name.toLowerCase().includes(q)
        || r.chosen?.source_ref?.name.toLowerCase().includes(q)
        || r.ref?.desc.some((d) => d.toLowerCase().includes(q)))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    }
    return all.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [catalog, spells, search]);

  const replace = (target: CharacterSpell, patch: Partial<CharacterSpell> | null, label: string) =>
    onChange(
      patch === null
        ? spells.filter((c) => c !== target)
        : spells.map((c) => (c === target ? { ...c, ...patch } : c)),
      label,
    );

  const limit = (source: SpellSource, key: 'cantrips' | 'spells' | 'prepares', label: string) => {
    const auto = key === 'cantrips' ? source.autoCantrips : key === 'spells' ? source.autoSpells : source.autoPrepares ?? 0;
    return (
      <span className="sheet-tracker-max">
        {label}
        <OverridableNumber
          auto={auto}
          value={overrides[`spells:${source.key}:${key}`]}
          editable
          max={99}
          onChange={(v) => onOverride(`spells:${source.key}:${key}`, v, `${source.label} ${label.toLowerCase()}`)}
          aria-label={`${source.label} ${label}`}
        />
      </span>
    );
  };

  return (
    <div className="d-flex flex-column gap-3">
      <div className="sheet-panel-head">
        {sources.length > 1 && (
          <SegmentedTabs
            options={[{ key: 'all', label: 'All' }, ...sources.map((s) => ({ key: s.key, label: s.label }))]}
            value={filter}
            onChange={setFilter}
            aria-label="Spell sources"
          />
        )}
        {isOwner && !narrow && pickable.length > 0 && (
          <button type="button" className="sheet-btn sheet-btn--primary" onClick={addSpells}>+ Add spells</button>
        )}
        {isOwner && (
          <button type="button" className={`sheet-btn ${adjusting ? 'sheet-btn--primary' : ''}`} onClick={() => setAdjusting((a) => !a)} aria-pressed={adjusting}>
            {adjusting ? 'Done' : 'Adjust'}
          </button>
        )}
      </div>

      {slots.length > 0 && slots.every((sl) => sl.used >= sl.total) && (
        <p className="sheet-banner sheet-banner--warn" role="status">
          All spell slots are spent. A rest brings them back; cantrips are still free.
        </p>
      )}

      {sources.length > 1 && (
        <input
          className="form-control input-theme"
          placeholder="Search spells by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search spells"
        />
      )}

      {sources.length === 1 && (
        <p className="sheet-empty">
          Nothing gives this character spells yet. Spellcasting classes, some races and feats like Magic Initiate do.
          {isOwner && ' You can still add spells from a background, an item or your DM under Other.'}
        </p>
      )}

      {visible.map((source) => {
        const rows = rowsFor(source);
        const byLevel = rows.reduce<Record<number, Row[]>>((acc, r) => { (acc[r.level] = acc[r.level] || []).push(r); return acc; }, {});
        return (
          <section key={source.key} className="sheet-spell-source" aria-label={source.label}>
            <header className="sheet-spell-source-head">
              <div className="sheet-spell-source-title">
                <strong>{source.label}</strong>
                {source.ability && (
                  <span className="sheet-spell-numbers">
                    <span>{ABILITY_SHORT[source.ability]}</span>
                    <span>
                      Save DC{' '}
                      <OverridableNumber
                        auto={source.autoSaveDc!}
                        value={overrides[`spelldc:${source.key}`]}
                        editable={isOwner}
                        onChange={(v) => onOverride(`spelldc:${source.key}`, v, `${source.label} save DC`)}
                        aria-label={`${source.label} spell save DC`}
                      />
                    </span>
                    <span>
                      Attack{' '}
                      <OverridableNumber
                        auto={source.autoAttack!}
                        value={overrides[`spellatk:${source.key}`]}
                        signed
                        editable={isOwner}
                        onChange={(v) => onOverride(`spellatk:${source.key}`, v, `${source.label} spell attack`)}
                        aria-label={`${source.label} spell attack bonus`}
                      />
                    </span>
                  </span>
                )}
              </div>
              <div className="sheet-spell-source-actions">
                {adjusting && !source.unlimited ? (
                  <span className="sheet-counts">
                    {limit(source, 'cantrips', 'Cantrips')}
                    {source.mode !== 'prepared' && limit(source, 'spells', source.mode === 'spellbook' ? 'Spellbook' : 'Spells')}
                    {source.autoPrepares !== undefined && limit(source, 'prepares', 'Prepared')}
                  </span>
                ) : (
                  <SourceCounts source={source} chosen={spells} />
                )}
                {isOwner && (source.unlimited || source.cantrips > 0 || source.spells > 0 || (source.prepares || 0) > 0) && (
                  <button type="button" className="sheet-btn sheet-btn--primary" onClick={() => startChoosing(source)}>
                    {source.mode === 'prepared' ? 'Prepare spells' : source.unlimited ? '+ Add spells' : 'Choose spells'}
                  </button>
                )}
              </div>
            </header>

            {rows.length === 0 ? (
              <p className="sheet-form-hint">No spells chosen yet.</p>
            ) : (
              Object.entries(byLevel).map(([lvl, list]) => (
                <div key={lvl} className="sheet-spell-level">
                  <h4 className="sheet-section-title">
                    {lvl === '0' ? 'Cantrips' : `${SPELL_LEVEL_LABEL[Number(lvl)]} level`}
                    {lvl !== '0' && slots.length > 0 && !freeSlotFor(slots, Number(lvl)) && (
                      <span className="sheet-chip sheet-chip--warn ms-2">slots used up</span>
                    )}
                  </h4>
                  <ul className="sheet-spell-list">
                    {list.map((row) => (
                      <SpellRow
                        key={row.key}
                        row={row}
                        source={source}
                        slots={slots}
                        isOwner={isOwner}
                        onRemove={() => row.chosen && replace(row.chosen, null, `remove ${row.name}`)}
                        onPrepare={(prepared) => row.chosen && replace(row.chosen, { prepared }, `${prepared ? 'prepare' : 'unprepare'} ${row.name}`)}
                        onCast={(slot) => onCast(slot.key, row.name)}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        );
      })}

      {isOwner && filter === 'all' && !spells.some((c) => c.source === 'other') && sources.length > 1 && (
        <button type="button" className="sheet-link align-self-start" onClick={() => setChoosing(sources.find((s) => s.key === 'other') || null)}>
          + Add a spell from somewhere else (background, item, DM)
        </button>
      )}

      <SpellOriginDialog
        isOpen={askingItem}
        characterId={characterId}
        campaignId={campaignId}
        campaignName={campaignName}
        isDm={isDm}
        onClose={() => setAskingItem(false)}
        onPick={(picked) => {
          setAskingItem(false);
          setOrigin(picked);
          const other = sources.find((src) => src.key === 'other');
          if (other) setChoosing(other);
        }}
      />

      <Modal isOpen={askingSource} toggle={() => setAskingSource(false)} centered fullscreen="sm" contentClassName="theme-modal">
        <ModalHeader toggle={() => setAskingSource(false)}>Where are these spells from?</ModalHeader>
        <ModalBody>
          <div className="sheet-more-list">
            {pickable.map((src) => (
              <button
                type="button"
                key={src.key}
                className="sheet-more-item sheet-source-item"
                onClick={() => { setAskingSource(false); startChoosing(src); }}
              >
                <span className="sheet-source-name">{src.key === 'other' ? 'Other' : src.label}</span>
                <span className="sheet-source-sub">
                  {src.key === 'other' ? 'An item, your DM, a background, or anything else' : <SourceCounts source={src} chosen={spells} />}
                </span>
              </button>
            ))}
          </div>
        </ModalBody>
      </Modal>

      {/* Not centered: the list changes height as you search, and a re-centring dialog moves under your finger. */}
      <Modal isOpen={!!choosing} toggle={() => setChoosing(null)} size="lg" fullscreen="sm" scrollable contentClassName="theme-modal sheet-chooser-modal">
        <ModalHeader toggle={() => setChoosing(null)}>{choosing?.mode === 'prepared' ? 'Prepare spells' : 'Choose spells'} · {choosing?.label}{origin ? ` · ${origin.name}` : ''}</ModalHeader>
        <ModalBody>
          {choosing && (
            <SpellChooser
              // Re-read the source so counts follow the live sheet.
              source={sources.find((s) => s.key === choosing.key) || choosing}
              chosen={spells}
              catalog={catalog}
              loading={loading}
              sourceRef={choosing.key === 'other' ? origin : null}
              onChange={onChange}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-theme-primary" onClick={() => setChoosing(null)}>Done</button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default SpellsPanel;
