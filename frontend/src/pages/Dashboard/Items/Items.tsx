import React, { useEffect, useState } from 'react';
import { getItems, deleteItem } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';
import DataTable, { Column } from '../../../components/DataTable';

interface Item {
  id: string;
  name: string;
  categories: string[];
  attunement: boolean;
  consumable: boolean;
  notes: string;
}

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getItems();
        setItems(res.data);
      } catch {
        setError('Could not load items.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('Could not delete item.');
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Items</h2>
          <p className="text-muted-theme mb-0">Your table of items.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card-theme p-4">
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          pageSize={10}
          searchable
          searchPlaceholder="Search items..."
          emptyMessage="No items yet."
          expandable={(item) => (
            <p className="text-muted-theme mb-0" style={{ fontSize: '0.875rem' }}>
              {item.notes || 'No notes.'}
            </p>
          )}
        />
      </div>
    </div>
  );
};

export default Items;