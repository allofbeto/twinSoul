import { useState } from 'react';
import type { AssetKind, NewItemInput, RevealAsset } from './types';

const KIND_LABEL_SINGULAR: Record<AssetKind, string> = {
  art: 'Art', map: 'Location', npc: 'NPC', encounter: 'Encounter', item: 'Item',
};

interface ItemCreateFormProps {
  kind: AssetKind;
  onCreate: (data: NewItemInput) => Promise<RevealAsset>;
}

export default function ItemCreateForm({ kind, onCreate }: ItemCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [categories, setCategories] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [attunement, setAttunement] = useState(false);
  const [consumable, setConsumable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = KIND_LABEL_SINGULAR[kind];

  const reset = () => {
    setName('');
    setCategories('');
    setNotes('');
    setImageUrl('');
    setAttunement(false);
    setConsumable(false);
    setError(null);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name: trimmed,
        kind,
        categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        attunement: kind === 'item' ? attunement : undefined,
        consumable: kind === 'item' ? consumable : undefined,
      });
      reset();
      setOpen(false);
    } catch {
      setError(`Could not create ${label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="theatre__btn theatre__btn--ghost theatre__tray-add" onClick={() => setOpen(true)}>
        + New {label}
      </button>
    );
  }

  return (
    <form
      className="theatre__item-form"
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
    >
      <input
        className="theatre__input"
        placeholder={`${label} name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className="theatre__input"
        placeholder="Categories (comma-separated)"
        value={categories}
        onChange={(e) => setCategories(e.target.value)}
      />
      <textarea
        className="theatre__input theatre__item-notes"
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <input
        className="theatre__input"
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      {kind === 'item' && (
        <div className="theatre__item-flags">
          <label className="theatre__item-flag">
            <input type="checkbox" checked={attunement} onChange={(e) => setAttunement(e.target.checked)} />
            Attunement
          </label>
          <label className="theatre__item-flag">
            <input type="checkbox" checked={consumable} onChange={(e) => setConsumable(e.target.checked)} />
            Consumable
          </label>
        </div>
      )}
      {error && <p className="theatre__item-error">{error}</p>}
      <div className="theatre__item-actions">
        <button type="submit" className="theatre__btn" disabled={saving}>
          {saving ? 'Adding…' : 'Add to campaign'}
        </button>
        <button type="button" className="theatre__btn theatre__btn--ghost" onClick={() => { reset(); setOpen(false); }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
