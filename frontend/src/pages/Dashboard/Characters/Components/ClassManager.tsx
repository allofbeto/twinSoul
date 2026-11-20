import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { ABILITY_INDEX_TO_KEY, CharClass, CharacterClassSummary } from '../classTypes';
import { addCharacterClass, removeCharacterClass, updateCharacterClass } from '../../../../api/backendHelpers';
import { isSelectableBy } from '../referenceCache';
import { useAuth } from '../../../../context/AuthContext';
import ClassIcon, { classIconKey } from './ClassIcon';
import { ABILITY_SHORT, AbilityKey, AbilityScoreSet } from '../sheetRules';
import '../../../../styles/homebrew.css'; // theme-modal

interface Props {
  characterId: string;
  classSummaries: CharacterClassSummary[];
  legacyClasses: string[];
  isOwner: boolean;
  /** For showing multiclass requirements. */
  scores?: AbilityScoreSet;
  onCharacterUpdated: (updated: any) => void;
}

/** Multiclass requirements as readable lines, each checked against the scores. */
const requirements = (cls: CharClass, scores?: AbilityScoreSet) => {
  const toLine = (opts: { ability_score: { index: string }; minimum_score: number }[], joiner: string) => {
    const parts = opts.map((p) => {
      const key = ABILITY_INDEX_TO_KEY[p.ability_score.index] as AbilityKey | undefined;
      return { text: `${key ? ABILITY_SHORT[key] : p.ability_score.index.toUpperCase()} ${p.minimum_score}`, ok: !!key && !!scores && scores[key] >= p.minimum_score };
    });
    return { text: parts.map((p) => p.text).join(joiner), ok: joiner === ' or ' ? parts.some((p) => p.ok) : parts.every((p) => p.ok) };
  };
  const lines = [];
  const all = cls.multi_classing?.prerequisites || [];
  if (all.length) lines.push(toLine(all, ' and '));
  const any = cls.multi_classing?.prerequisite_options?.from?.options || [];
  if (any.length) lines.push(toLine(any, ' or '));
  return lines;
};

// ── Add class dialog ─────────────────────────────────────────────────────────

const AddClassDialog = ({ isOpen, available, isMulticlass, scores, maxLevel, busy, error, onAdd, onClose }: {
  isOpen: boolean;
  available: CharClass[];
  isMulticlass: boolean;
  scores?: AbilityScoreSet;
  maxLevel: number;
  busy: boolean;
  error: string;
  onAdd: (args: { index: string; level: number; subclass?: string }) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<CharClass | null>(null);
  const [level, setLevel] = useState(1);
  const [subclass, setSubclass] = useState('');

  useEffect(() => {
    if (isOpen) { setQuery(''); setPicked(null); setLevel(1); setSubclass(''); }
  }, [isOpen]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [available, query]);

  const subclassReady = !!picked?.subclass_choice_level && level >= picked.subclass_choice_level && picked.subclasses.length > 0;

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered size="lg" fullscreen="sm" scrollable contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>{isMulticlass ? 'Add a class (multiclass)' : 'Add a class'}</ModalHeader>
      <ModalBody>
        <div className="sheet-form">
          {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
          <input
            className="form-control input-theme"
            placeholder="Search classes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search classes"
          />
          <div className="sheet-class-grid" role="listbox" aria-label="Classes">
            {shown.map((c) => {
              const reqs = isMulticlass ? requirements(c, scores) : [];
              const unmet = reqs.some((r) => !r.ok);
              return (
                <button
                  key={c.index}
                  type="button"
                  role="option"
                  aria-selected={picked?.index === c.index}
                  className={`sheet-class-card ${picked?.index === c.index ? 'is-picked' : ''}`}
                  onClick={() => { setPicked(c); setSubclass(''); }}
                >
                  <ClassIcon iconKey={classIconKey(c)} size="2rem" />
                  <span className="sheet-class-card-name">{c.name}</span>
                  <span className="sheet-class-card-meta">
                    d{c.hit_die}{c.spellcasting_ability ? ' · caster' : ''}{c.homebrew ? ' · homebrew' : ''}
                  </span>
                  {reqs.map((r) => (
                    <span key={r.text} className={`sheet-class-card-req ${r.ok ? 'is-ok' : 'is-unmet'}`}>
                      {r.ok ? '✓' : '!'} {r.text}
                    </span>
                  ))}
                  {unmet && <span className="sheet-visually-hidden">Requirements not met</span>}
                </button>
              );
            })}
            {shown.length === 0 && <p className="sheet-empty">No classes match.</p>}
          </div>

          {picked && (
            <div className="sheet-form-grid">
              <div className="sheet-form-row">
                <span className="sheet-label">{picked.name} level</span>
                <div className="sheet-stepper">
                  <button type="button" onClick={() => setLevel((l) => Math.max(1, l - 1))} disabled={level <= 1} aria-label="Lower level">−</button>
                  <strong>{level}</strong>
                  <button type="button" onClick={() => setLevel((l) => Math.min(maxLevel, l + 1))} disabled={level >= maxLevel} aria-label="Raise level">+</button>
                </div>
              </div>
              {subclassReady && (
                <label className="sheet-form-row">
                  <span className="sheet-label">Subclass</span>
                  <select className="form-select input-theme" value={subclass} onChange={(e) => setSubclass(e.target.value)}>
                    <option value="">Choose later</option>
                    {picked.subclasses.map((sc) => <option key={sc.index} value={sc.index}>{sc.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          {isMulticlass && picked && requirements(picked, scores).some((r) => !r.ok) && (
            <p className="sheet-form-hint">
              Your scores don’t meet the usual multiclass requirement. Many tables waive it, so it’s your call.
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn btn-theme-primary"
          disabled={!picked || busy}
          onClick={() => picked && onAdd({ index: picked.index, level, subclass: subclass || undefined })}
        >
          {busy ? 'Adding…' : picked ? `Add ${picked.name} ${level}` : 'Pick a class'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

// ── Class list ───────────────────────────────────────────────────────────────

const ClassManager = ({ characterId, classSummaries, legacyClasses, isOwner, scores, onCharacterUpdated }: Props) => {
  const { classes } = useCharClasses();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CharacterClassSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const takenIndexes = classSummaries.filter((s) => s.char_class_index).map((s) => s.char_class_index as string);
  const available = classes.filter((c) => !takenIndexes.includes(c.index) && isSelectableBy(c, user?.id));
  const totalLevel = classSummaries.reduce((n, s) => n + s.level, 0);

  const run = async (fn: () => Promise<{ data: unknown }>, fallback: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      onCharacterUpdated(res.data);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || fallback);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (s: CharacterClassSummary) => findCharClass(classes, s.char_class_index)?.name || s.char_class_name || s.custom_name || 'Class';

  return (
    <div className="sheet-classes">
      {error && !adding && <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: '0.75rem' }}>{error}</div>}

      {classSummaries.length > 0 ? (
        <ul className="sheet-class-list">
          {classSummaries.map((s) => {
            const cls = findCharClass(classes, s.char_class_index);
            const subclass = cls?.subclasses.find((sc) => sc.index === s.subclass_index);
            const canPickSubclass = !!cls && cls.subclasses.length > 0 && !!cls.subclass_choice_level && s.level >= cls.subclass_choice_level;
            return (
              <li key={s.id} className="sheet-class-row">
                {cls && <ClassIcon iconKey={classIconKey(cls)} size="1.6rem" />}
                <div className="sheet-class-row-main">
                  <span className="sheet-class-row-name">{nameOf(s)}</span>
                  {isOwner && canPickSubclass ? (
                    <select
                      className="form-select input-theme sheet-select-inline"
                      value={s.subclass_index || ''}
                      onChange={(e) => run(() => updateCharacterClass(characterId, s.id, { subclass_index: e.target.value }), 'Could not update subclass.')}
                      disabled={busy}
                      aria-label={`${nameOf(s)} subclass`}
                    >
                      <option value="">Subclass…</option>
                      {cls!.subclasses.map((sc) => <option key={sc.index} value={sc.index}>{sc.name}</option>)}
                    </select>
                  ) : (
                    <span className="sheet-class-row-sub">
                      {subclass?.name || (cls?.subclass_choice_level ? `Subclass at level ${cls.subclass_choice_level}` : '')}
                    </span>
                  )}
                </div>
                {isOwner ? (
                  <div className="sheet-stepper sheet-stepper--sm" aria-label={`${nameOf(s)} level`}>
                    <button
                      type="button"
                      onClick={() => run(() => updateCharacterClass(characterId, s.id, { level: s.level - 1 }), 'Could not change the level.')}
                      disabled={busy || s.level <= 1}
                      aria-label={`Lower ${nameOf(s)} level`}
                    >−</button>
                    <strong>{s.level}</strong>
                    <button
                      type="button"
                      onClick={() => run(() => updateCharacterClass(characterId, s.id, { level: s.level + 1 }), 'Could not change the level.')}
                      disabled={busy || totalLevel >= 20}
                      aria-label={`Raise ${nameOf(s)} level`}
                    >+</button>
                  </div>
                ) : (
                  <strong className="sheet-class-row-level">{s.level}</strong>
                )}
                {isOwner && (
                  <button type="button" className="sheet-icon-btn" onClick={() => setRemoving(s)} disabled={busy} aria-label={`Remove ${nameOf(s)}`}>
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : legacyClasses.length > 0 ? (
        <div>
          <div className="d-flex flex-wrap gap-1 mb-1">
            {legacyClasses.map((c) => <span key={c} className="badge-cls">{c}</span>)}
          </div>
          {isOwner && <p className="sheet-form-hint mb-0">Typed-in classes from before. Add a real class to get its features and numbers.</p>}
        </div>
      ) : (
        <p className="sheet-form-hint mb-0">No class yet.</p>
      )}

      {isOwner && available.length > 0 && totalLevel < 20 && (
        <button type="button" className="sheet-btn mt-2" onClick={() => { setError(''); setAdding(true); }}>
          + Add class
        </button>
      )}

      <AddClassDialog
        isOpen={adding}
        available={available}
        isMulticlass={classSummaries.length > 0}
        scores={scores}
        maxLevel={Math.max(1, 20 - totalLevel)}
        busy={busy}
        error={error}
        onAdd={async ({ index, level, subclass }) => {
          const ok = await run(() => addCharacterClass(characterId, { char_class_index: index, level, subclass_index: subclass }), 'Could not add class.');
          if (ok) setAdding(false);
        }}
        onClose={() => setAdding(false)}
      />

      <Modal isOpen={!!removing} toggle={() => setRemoving(null)} centered contentClassName="theme-modal">
        <ModalHeader toggle={() => setRemoving(null)}>Remove {removing ? nameOf(removing) : 'class'}?</ModalHeader>
        <ModalBody>
          Your level drops by {removing?.level}. Hit points, feats and ability scores stay as they are, so adjust them if they came from this class.
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setRemoving(null)}>Keep it</button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={async () => {
              if (!removing) return;
              const target = removing;
              setRemoving(null);
              await run(() => removeCharacterClass(characterId, target.id), 'Could not remove class.');
            }}
          >
            Remove
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ClassManager;
