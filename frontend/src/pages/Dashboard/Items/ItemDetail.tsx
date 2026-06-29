import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItem, updateItem, deleteItem } from '../../../api/backendHelpers';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import RichTextEditor from '../../../components/formComponents/RichTextEditor';

interface Item {
  id: string;
  name: string;
  categories: string[];
  notes: string;
  attunement: boolean;
  consumable: boolean;
}

const CATEGORIES = [
  'Weapon', 'Armor', 'Potion', 'Scroll', 'Wondrous Item',
  'Ring', 'Staff', 'Wand', 'Rod', 'Tool', 'Ammunition', 'Misc'
];

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Item | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalFunction, setModalFunction] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getItem(id!);
        setItem(res.data);
        setForm(res.data);
      } catch {
        console.error('Could not load item');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form!, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const toggleCategory = (cat: string) => {
    setForm({
      ...form!,
      categories: form!.categories.includes(cat)
        ? form!.categories.filter((c) => c !== cat)
        : [...form!.categories, cat],
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateItem(id!, form!);
      setItem(form);
      setIsDirty(false);
      setEditing(false);
    } catch {
      console.error('Could not save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem(id!);
      navigate('/dashboard/items');
    } catch {
      console.error('Could not delete item');
    }
  };

  const modalSwitch = (fn: string | null) => {
    switch (fn) {
      case 'delete':
        return {
          title: 'Delete Item',
          body: (
            <div>
              <p className="text-muted-theme mb-4">
                Are you sure you want to delete <strong className="text-theme">{item?.name}</strong>? This cannot be undone.
              </p>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ),
        };
      default:
        return null;
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!item || !form) return <p className="text-muted-theme">Item not found.</p>;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* Book-style top bar */}
      <div className="sticky-save-bar">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate('/dashboard/items')}
            >
              ← Back
            </button>
            {editing ? (
              <input
                type="text"
                name="name"
                className="stat-input-inline"
                style={{ fontSize: '1.25rem', fontWeight: 700 }}
                value={form.name}
                onChange={handleChange}
              />
            ) : (
              <h2 className="text-theme mb-0" style={{ cursor: 'pointer' }} onClick={() => setEditing(true)}>
                {item.name}
              </h2>
            )}
          </div>
          <div className="d-flex gap-2">
            {isDirty && (
              <button type="button" className="btn btn-theme-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            {editing ? (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setEditing(false); setForm(item); setIsDirty(false); }}>
                Cancel
              </button>
            ) : (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(true)}>
                ✎ Edit
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => { setModalFunction('delete'); setShowModal(true); }}
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Book page */}
            {/* Book page */}
<div className="item-book-page-wrapper">
  <div className="item-book-page">

    {/* Page title */}
    <div className="item-page-title">{editing ? (
      <input
        type="text"
        name="name"
        className="stat-input-inline"
        style={{ fontSize: '1.5rem', textAlign: 'center', width: '100%' }}
        value={form.name}
        onChange={handleChange}
      />
    ) : item.name}</div>
    <div className="item-page-divider">✦ ─── ✦ ─── ✦</div>

    {/* Category pills */}
    <div className="mb-4">
      <p className="text-muted-theme mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Categories
      </p>
      {editing ? (
        <div className="d-flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat}
              className={`btn btn-sm ${form.categories.includes(cat) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : (
        <div className="d-flex flex-wrap gap-2">
          {item.categories.length > 0 ? item.categories.map((cat) => (
            <span key={cat} className="badge-cls">{cat}</span>
          )) : <span className="text-muted-theme">—</span>}
        </div>
      )}
    </div>

    {/* Flags */}
    <div className="mb-4 d-flex gap-4">
      <label className="d-flex align-items-center gap-2" style={{ cursor: editing ? 'pointer' : 'default' }}>
        <input
          type="checkbox"
          checked={form.attunement}
          disabled={!editing}
          onChange={(e) => { setForm({ ...form, attunement: e.target.checked }); setIsDirty(true); }}
        />
        <span className="text-muted-theme">Requires Attunement</span>
      </label>
      <label className="d-flex align-items-center gap-2" style={{ cursor: editing ? 'pointer' : 'default' }}>
        <input
          type="checkbox"
          checked={form.consumable}
          disabled={!editing}
          onChange={(e) => { setForm({ ...form, consumable: e.target.checked }); setIsDirty(true); }}
        />
        <span className="text-muted-theme">Consumable</span>
      </label>
    </div>

    <hr style={{ borderColor: 'var(--color-border)', margin: '1.5rem 0' }} />

    {/* Notes */}
    {editing ? (
  <RichTextEditor
    content={form.notes || ''}
    onChange={(html) => { setForm({ ...form, notes: html }); setIsDirty(true); }}
  />
) : (
  <div className="item-page-text" onClick={() => setEditing(true)}>
    <RichTextEditor
      content={item.notes || '<p style="font-style:italic">No description yet. Click to add one.</p>'}
      onChange={() => {}}
      readOnly
    />
  </div>
)}

    {/* Page number */}
    <div className="item-page-number">— 1 —</div>
  </div>
</div>

      <Modal isOpen={showModal} toggle={() => setShowModal(false)}>
        <ModalHeader toggle={() => setShowModal(false)}>
          {modalSwitch(modalFunction)?.title}
        </ModalHeader>
        <ModalBody>
          {modalSwitch(modalFunction)?.body}
        </ModalBody>
      </Modal>
    </div>
  );
};

export default ItemDetail;