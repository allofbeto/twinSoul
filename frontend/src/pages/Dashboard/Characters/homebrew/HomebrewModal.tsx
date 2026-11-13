import React, { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import {
  createHomebrewClass,
  createHomebrewRace,
  deleteHomebrewClass,
  deleteHomebrewRace,
  importHomebrew,
  updateHomebrewClass,
  updateHomebrewRace,
} from '../../../../api/backendHelpers';
import { CharRace } from '../raceTypes';
import { CharClass } from '../classTypes';
import { removeCharRace, upsertCharRace } from '../useCharRaces';
import { removeCharClass, upsertCharClass } from '../useCharClasses';
import {
  ClassDraft,
  RaceDraft,
  classToDraft,
  emptyClass,
  emptyRace,
  importedClass,
  importedRace,
  raceToDraft,
} from './draftTypes';
import HomebrewRaceForm from './HomebrewRaceForm';
import HomebrewClassForm from './HomebrewClassForm';
import '../../../../styles/homebrew.css';

type Props =
  | { kind: 'race'; isOpen: boolean; existing?: CharRace | null; onClose: () => void; onSaved?: (race: CharRace) => void; onDeleted?: (index: string) => void }
  | { kind: 'class'; isOpen: boolean; existing?: CharClass | null; onClose: () => void; onSaved?: (cls: CharClass) => void; onDeleted?: (index: string) => void };

const GAME = 'dnd_5e';

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.errors?.join(', ') || err?.response?.data?.error || fallback;

// Create or edit a homebrew race/class, by hand or by importing a page and
// fixing up what came back. Saving makes it available to the author's own
// characters right away; a DM reviews it once a character using it joins a
// campaign.
const HomebrewModal = (props: Props) => {
  const { kind, isOpen, existing, onClose } = props;
  const noun = kind === 'race' ? 'race' : 'class';

  const [raceDraft, setRaceDraft] = useState<RaceDraft>(emptyRace);
  const [classDraft, setClassDraft] = useState<ClassDraft>(emptyClass);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importNotes, setImportNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setImportNotes('');
    setConfirmDelete(false);
    setImportUrl(existing?.source_url || '');
    if (kind === 'race') setRaceDraft(existing ? raceToDraft(existing as CharRace) : emptyRace());
    else setClassDraft(existing ? classToDraft(existing as CharClass) : emptyClass());
  }, [isOpen, existing, kind]);

  const draftName = kind === 'race' ? raceDraft.name : classDraft.name;

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError('');
    setImportNotes('');
    try {
      const res = await importHomebrew(importUrl.trim(), kind);
      const { notes, ...data } = res.data;
      if (kind === 'race') setRaceDraft(importedRace(data));
      else setClassDraft(importedClass(data));
      setImportNotes(notes || '');
    } catch (err: any) {
      setError(errorMessage(err, 'Import failed. You can still fill the form in by hand.'));
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!draftName.trim()) {
      setError(`Give your ${noun} a name.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (kind === 'race') {
        const body = { ...raceDraft, source_url: raceDraft.source_url || importUrl.trim() };
        const res = existing ? await updateHomebrewRace(existing.index, body) : await createHomebrewRace(body);
        upsertCharRace(GAME, res.data, existing?.index);
        props.onSaved?.(res.data);
      } else {
        const body = { ...classDraft, source_url: classDraft.source_url || importUrl.trim() };
        const res = existing ? await updateHomebrewClass(existing.index, body) : await createHomebrewClass(body);
        upsertCharClass(GAME, res.data, existing?.index);
        props.onSaved?.(res.data);
      }
      onClose();
    } catch (err: any) {
      setError(errorMessage(err, `Couldn't save this ${noun}.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setSaving(true);
    setError('');
    try {
      if (kind === 'race') {
        await deleteHomebrewRace(existing.index);
        removeCharRace(GAME, existing.index);
      } else {
        await deleteHomebrewClass(existing.index);
        removeCharClass(GAME, existing.index);
      }
      props.onDeleted?.(existing.index);
      onClose();
    } catch (err: any) {
      setError(errorMessage(err, `Couldn't delete this ${noun}.`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg" scrollable fullscreen="sm" contentClassName="homebrew-modal">
      <ModalHeader toggle={onClose}>
        {existing ? `Edit homebrew ${noun}: ${existing.name}` : `New homebrew ${noun}`}
      </ModalHeader>
      <ModalBody>
        <div className="homebrew-import mb-3">
          <label className="form-label text-theme mb-1" htmlFor="homebrew-import-url">Import from a link</label>
          <p className="text-muted-theme mb-2" style={{ fontSize: '0.78rem' }}>
            Paste a page from D&amp;D Wiki, Homebrewery, GM Binder or anywhere else that describes the {noun}. We'll fill in the form below for you to check before saving.
          </p>
          <div className="homebrew-import-row">
            <input
              id="homebrew-import-url"
              type="url"
              className="form-control input-theme"
              placeholder="https://"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImport())}
              disabled={importing}
            />
            <button type="button" className="btn btn-outline-secondary text-nowrap" onClick={handleImport} disabled={importing || !importUrl.trim()}>
              {importing ? 'Reading page…' : 'Import'}
            </button>
          </div>
          {importing && (
            <p className="text-muted-theme mt-2 mb-0" style={{ fontSize: '0.78rem' }}>This can take up to a minute for long pages.</p>
          )}
        </div>

        {importNotes && (
          <div className="homebrew-notice homebrew-notice--info mb-3" role="status">
            <strong>Check before saving:</strong> {importNotes}
          </div>
        )}
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

        {kind === 'race'
          ? <HomebrewRaceForm draft={raceDraft} onChange={setRaceDraft} />
          : <HomebrewClassForm draft={classDraft} onChange={setClassDraft} />}
      </ModalBody>
      <ModalFooter className="homebrew-modal-footer">
        <div className="homebrew-modal-footer__delete">
          {existing && (
            confirmDelete ? (
              <span className="d-flex flex-wrap gap-2 align-items-center">
                <span className="text-muted-theme" style={{ fontSize: '0.8rem' }}>Delete for good?</span>
                <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmDelete(false)}>Keep</button>
              </span>
            ) : (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            )
          )}
        </div>
        <span className="homebrew-modal-footer__hint text-muted-theme">
          Your DM approves homebrew when the character joins their campaign.
        </span>
        <div className="homebrew-modal-footer__actions">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleSave} disabled={saving || importing}>
            {saving ? 'Saving…' : existing ? 'Save changes' : `Save ${noun}`}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default HomebrewModal;
