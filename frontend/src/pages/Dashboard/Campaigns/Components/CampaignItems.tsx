import React, { useEffect, useState } from 'react';
import { getItems, createItem, deleteItem } from '../../../../api/backendHelpers';
import DataTable, { Column } from '../../../../components/DataTable';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

interface Item {
  id: string;
  name: string;
  categories: string[];
  notes: string;
  attunement: boolean;
  consumable: boolean;
  campaign_id: string | null;
}

interface Props {
  campaignId: string;
}

const CATEGORIES = [
  'Weapon', 'Armor', 'Potion', 'Scroll', 'Wondrous Item',
  'Ring', 'Staff', 'Wand', 'Rod', 'Tool', 'Ammunition', 'Misc'
];

const CampaignItems = ({ campaignId }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalFunction, setModalFunction] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    categories: [] as string[],
    notes: '',
    attunement: false,
    consumable: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getItems();
        const filtered = res.data.filter((i: Item) => i.campaign_id === campaignId);
        setItems(filtered);
      } catch {
        console.error('Could not load items');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [campaignId]);

  const toggleCategory = (cat: string) => {
    setNewItem((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleCreate = async () => {
    if (!newItem.name.trim()) return;
    try {
      const res = await createItem({ ...newItem, campaign_id: campaignId });
      setItems((prev) => [...prev, res.data]);
      setNewItem({ name: '', categories: [], notes: '', attunement: false, consumable: false });
      setShowModal(false);
    } catch {
      console.error('Could not create item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      console.error('Could not delete item');
    }
  };

  const modalSwitch = (fn: string | null) => {
    switch (fn) {
      case 'new_item':
        return {
          title: 'New Item',
          body: (
            <div>
              <div className="mb-3">
                <label className="form-label text-muted-theme">Name</label>
                <input
                  type="text"
                  className="form-control input-theme"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Item name..."
                />
              </div>
              <div className="mb-3">
                <label className="form-label text-muted-theme">Categories</label>
                <div className="d-flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      className={`btn btn-sm ${newItem.categories.includes(cat) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="d-flex gap-3 mb-3">
                <label className="text-muted-theme d-flex align-items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newItem.attunement}
                    onChange={(e) => setNewItem({ ...newItem, attunement: e.target.checked })}
                  />
                  Attunement
                </label>
                <label className="text-muted-theme d-flex align-items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newItem.consumable}
                    onChange={(e) => setNewItem({ ...newItem, consumable: e.target.checked })}
                  />
                  Consumable
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted-theme">Notes</label>
                <textarea
                  className="form-control input-theme"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  rows={3}
                  placeholder="Describe this item..."
                />
              </div>
              <button type="button" className="btn btn-theme-primary" onClick={handleCreate}>
                Create Item
              </button>
            </div>
          ),
        };
      default:
        return null;
    }
  };

  const columns: Column<Item>[] = [
    {
      key: 'name',
      label: 'NAME',
      width: '35%',
      sortable: true,
      render: (item) => (
        <span
          style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
          onClick={() => navigate(`/dashboard/items/${item.id}`)}
        >
          {item.name}
        </span>
      ),
    },
    {
      key: 'categories',
      label: 'CATEGORIES',
      width: '30%',
      render: (item) => (
        <div className="d-flex flex-wrap gap-1">
          {item.categories?.slice(0, 2).map((cat) => (
            <span key={cat} className="badge-cls" style={{ fontSize: '0.7rem' }}>{cat}</span>
          ))}
          {item.categories?.length > 2 && (
            <span className="text-muted-theme" style={{ fontSize: '0.7rem' }}>+{item.categories.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'flags',
      label: 'FLAGS',
      width: '20%',
      align: 'center',
      render: (item) => (
        <div className="d-flex gap-1 justify-content-center">
          {item.attunement && <span className="badge-cls" style={{ fontSize: '0.65rem', background: 'var(--color-secondary)' }}>ATT</span>}
          {item.consumable && <span className="badge-cls" style={{ fontSize: '0.65rem', background: 'var(--color-accent)' }}>CON</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '15%',
      align: 'right',
      render: (item) => (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => handleDelete(item.id)}
        >
          ×
        </button>
      ),
    },
  ];

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="card-theme p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="text-theme mb-0">Campaign Items</h5>
          <button
            type="button"
            className="btn btn-theme-primary btn-sm"
            onClick={() => { setModalFunction('new_item'); setShowModal(true); }}
          >
            + New Item
          </button>
        </div>

        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          pageSize={10}
          searchable
          searchPlaceholder="Search items..."
          emptyMessage="No items in this campaign yet."
          expandable={(item) => (
            <p className="text-muted-theme mb-0" style={{ fontSize: '0.875rem' }}>
              {item.notes || 'No notes.'}
            </p>
          )}
        />
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

export default CampaignItems;