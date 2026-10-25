import React, { useState } from 'react';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { CharacterClassSummary } from '../classTypes';
import { addCharacterClass, removeCharacterClass, updateCharacterClass } from '../../../../api/backendHelpers';

interface Props {
  characterId: string;
  classSummaries: CharacterClassSummary[];
  legacyClasses: string[];
  isOwner: boolean;
  onCharacterUpdated: (updated: any) => void;
}

const ClassManager = ({ characterId, classSummaries, legacyClasses, isOwner, onCharacterUpdated }: Props) => {
  const { classes } = useCharClasses();
  const [adding, setAdding] = useState(false);
  const [newClassIndex, setNewClassIndex] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [newSubclass, setNewSubclass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const takenIndexes = classSummaries.filter((s) => s.char_class_index).map((s) => s.char_class_index as string);
  const available = classes.filter((c) => !takenIndexes.includes(c.index));
  const newClassData = findCharClass(classes, newClassIndex || undefined);
  const showSubclassField = !!(newClassData?.subclass_choice_level && newLevel >= newClassData.subclass_choice_level);

  const resetAddForm = () => {
    setAdding(false);
    setNewClassIndex('');
    setNewLevel(1);
    setNewSubclass('');
    setError('');
  };

  const handleAdd = async () => {
    if (!newClassIndex) return;
    setBusy(true);
    setError('');
    try {
      const res = await addCharacterClass(characterId, {
        char_class_index: newClassIndex,
        level: newLevel,
        subclass_index: newSubclass || undefined,
      });
      onCharacterUpdated(res.data);
      resetAddForm();
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Could not add class.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this class from the character?')) return;
    setBusy(true);
    try {
      const res = await removeCharacterClass(characterId, id);
      onCharacterUpdated(res.data);
    } catch {
      setError('Could not remove class.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubclassChange = async (id: string, subclassIndex: string) => {
    setBusy(true);
    try {
      const res = await updateCharacterClass(characterId, id, { subclass_index: subclassIndex });
      onCharacterUpdated(res.data);
    } catch {
      setError('Could not update subclass.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: '0.75rem' }}>{error}</div>}

      {classSummaries.length > 0 ? (
        <div className="d-flex flex-column gap-2">
          {classSummaries.map((s) => {
            const cls = findCharClass(classes, s.char_class_index);
            return (
              <div key={s.id} className="d-flex align-items-center justify-content-between gap-2">
                <span className="badge-cls" style={{ fontSize: '0.8rem' }}>
                  {cls?.name || s.char_class_name || s.custom_name} {s.level}
                </span>
                {isOwner && cls && cls.subclasses.length > 0 && (
                  cls.subclass_choice_level && s.level >= cls.subclass_choice_level ? (
                    <select
                      className="form-select input-theme"
                      style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', width: 'auto' }}
                      value={s.subclass_index || ''}
                      onChange={(e) => handleSubclassChange(s.id, e.target.value)}
                      disabled={busy}
                    >
                      <option value="">— subclass —</option>
                      {cls.subclasses.map((sc) => (
                        <option key={sc.index} value={sc.index}>{sc.name}</option>
                      ))}
                    </select>
                  ) : null
                )}
                {isOwner && (
                  <button
                    type="button"
                    className="badge-cls-remove"
                    onClick={() => handleRemove(s.id)}
                    disabled={busy}
                    title="Remove class"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : legacyClasses.length > 0 ? (
        <div>
          <div className="d-flex flex-wrap gap-1 mb-1">
            {legacyClasses.map((cls) => (
              <span key={cls} className="badge-cls" style={{ fontSize: '0.8rem' }}>{cls}</span>
            ))}
          </div>
          {isOwner && (
            <p className="text-muted-theme mb-0" style={{ fontSize: '0.7rem' }}>
              Legacy freeform classes. Add a real class below to replace this list.
            </p>
          )}
        </div>
      ) : (
        <span className="text-muted-theme">—</span>
      )}

      {isOwner && (
        adding ? (
          <div className="mt-2 d-flex flex-column gap-2">
            <select
              className="form-select input-theme"
              style={{ fontSize: '0.8rem' }}
              value={newClassIndex}
              onChange={(e) => setNewClassIndex(e.target.value)}
            >
              <option value="">Select class...</option>
              {available.map((c) => (
                <option key={c.index} value={c.index}>{c.name} (d{c.hit_die})</option>
              ))}
            </select>
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted-theme" style={{ fontSize: '0.75rem' }}>Level</span>
              <input
                type="number"
                className="stat-input-inline"
                min={1}
                max={20}
                value={newLevel}
                onChange={(e) => setNewLevel(parseInt(e.target.value) || 1)}
              />
            </div>
            {showSubclassField && newClassData && (
              <select
                className="form-select input-theme"
                style={{ fontSize: '0.8rem' }}
                value={newSubclass}
                onChange={(e) => setNewSubclass(e.target.value)}
              >
                <option value="">— subclass (optional) —</option>
                {newClassData.subclasses.map((sc) => (
                  <option key={sc.index} value={sc.index}>{sc.name}</option>
                ))}
              </select>
            )}
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleAdd} disabled={!newClassIndex || busy}>
                Add
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetAddForm}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          available.length > 0 && (
            <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={() => setAdding(true)}>
              + Add Class
            </button>
          )
        )
      )}
    </div>
  );
};

export default ClassManager;
