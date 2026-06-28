import React, { useEffect, useState } from 'react';
import { getInventoryItems, addInventoryItem, removeInventoryItem } from '../../../../api/backendHelpers';

interface Item {
  id: string;
  name: string;
  categories: string[];
  notes: string;
  attunement: boolean;
  consumable: boolean;
}

interface Props {
  characterId: string;
}

const CATEGORIES = [
  'Weapon', 'Armor', 'Potion', 'Scroll', 'Wondrous Item',
  'Ring', 'Staff', 'Wand', 'Rod', 'Tool', 'Ammunition', 'Misc'
];

const InventoryTable = ({ characterId }: Props) => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'category'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [newItem, setNewItem] = useState({
        name: '',
        categories: [] as string[],
        notes: '',
        attunement: false,
        consumable: false,
    });

    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetch = async () => {
        try {
            const res = await getInventoryItems(characterId);
            setItems(res.data);
            const q: Record<string, number> = {};
            res.data.forEach((item: Item) => { q[item.id] = 1; });
            setQuantities(q);
        } catch {
            console.error('Could not load items');
        } finally {
            setLoading(false);
        }
        };
        fetch();
    }, [characterId]);

    const handleSort = (col: 'name' | 'category') => {
        if (sortBy === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
        setSortBy(col);
        setSortDir('asc');
        }
    };

    const handleAdd = async () => {
        if (!newItem.name.trim()) return;
        try {
        const res = await addInventoryItem(characterId, newItem);
        setItems((prev) => [...prev, res.data]);
        setQuantities((prev) => ({ ...prev, [res.data.id]: 1 }));
        setNewItem({ name: '', categories: [], notes: '', attunement: false, consumable: false });
        setShowAddForm(false);
        } catch {
        console.error('Could not create item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this item?')) return;
        await removeInventoryItem(characterId, id);
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const toggleCategory = (cat: string) => {
        setNewItem((prev) => ({
        ...prev,
        categories: prev.categories.includes(cat)
            ? prev.categories.filter((c) => c !== cat)
            : [...prev.categories, cat],
        }));
    };

    const filtered = items
        .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
        .filter((item) => filterCategory ? item.categories.includes(filterCategory) : true)
        .sort((a, b) => {
            const aVal = sortBy === 'name' ? a.name : a.categories[0] || '';
            const bVal = sortBy === 'name' ? b.name : b.categories[0] || '';
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };
      
    const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterCategory(e.target.value);
        setPage(1);
    };

    if (loading) return <p className="text-muted-theme">Loading inventory...</p>;

  return (
    <div>
        {/* Toolbar */}
        <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <input
            type="text"
            className="form-control input-theme"
            placeholder="Search items..."
            value={search}
            onChange={handleSearch}
            style={{ maxWidth: '220px' }}
        />
        <select
            className="form-control input-theme"
            value={filterCategory}
            onChange={handleFilter}
            style={{ maxWidth: '160px' }}
        >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
            ))}
        </select>
        <button
            type="button"
            className="btn btn-theme-primary btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowAddForm(!showAddForm)}
        >
            {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
        <div className="card-theme p-3 mb-3">
            <h6 className="text-theme mb-3">New Item</h6>
            <div className="d-flex gap-2 mb-2 flex-wrap">
            <input
                type="text"
                className="form-control input-theme"
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                style={{ maxWidth: '200px' }}
            />
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
            <div className="d-flex flex-wrap gap-1 mb-2">
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
            <textarea
            className="form-control input-theme mb-2"
            placeholder="Notes (optional)"
            value={newItem.notes}
            onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
            rows={2}
            />
            <button
            type="button"
            className="btn btn-theme-primary btn-sm"
            onClick={handleAdd}
            >
            Save Item
            </button>
        </div>
        )}

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
            <tr>
                <th
                className="text-muted-theme"
                style={{ fontSize: '0.75rem', padding: '0.5rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('name')}
                >
                NAME {sortBy === 'name' ? (sortDir === 'asc' ? '▴' : '▾') : ''}
                </th>
                <th
                className="text-muted-theme"
                style={{ fontSize: '0.75rem', padding: '0.5rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('category')}
                >
                CATEGORY {sortBy === 'category' ? (sortDir === 'asc' ? '▴' : '▾') : ''}
                </th>
                <th className="text-muted-theme" style={{ fontSize: '0.75rem', padding: '0.5rem', textAlign: 'center' }}>QTY</th>
                <th className="text-muted-theme" style={{ fontSize: '0.75rem', padding: '0.5rem', textAlign: 'center' }}>FLAGS</th>
                <th style={{ width: '100px' }}></th>
            </tr>
            </thead>
            <tbody>
            {filtered.length === 0 && (
                <tr>
                <td colSpan={5} className="text-muted-theme" style={{ padding: '1rem', textAlign: 'center' }}>
                    No items found.
                </td>
                </tr>
            )}
            {paginated.map((item) => (
                <React.Fragment key={item.id}>
                <tr className="skill-row">
                    <td style={{ padding: '0.5rem', color: 'var(--color-text)', fontSize: '0.9rem' }}>
                    {item.name}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                    <div className="d-flex flex-wrap gap-1">
                        {item.categories.map((cat) => (
                        <span key={cat} className="badge-cls" style={{ fontSize: '0.7rem' }}>{cat}</span>
                        ))}
                    </div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                        <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        style={{ padding: '0 6px', lineHeight: '1.4' }}
                        onClick={() => setQuantities((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 1) - 1) }))}
                        >−</button>
                        <span style={{ minWidth: '20px', textAlign: 'center', color: 'var(--color-text)' }}>
                        {quantities[item.id] ?? 1}
                        </span>
                        <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        style={{ padding: '0 6px', lineHeight: '1.4' }}
                        onClick={() => setQuantities((prev) => ({ ...prev, [item.id]: (prev[item.id] || 1) + 1 }))}
                        >+</button>
                    </div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <div className="d-flex gap-1 justify-content-center">
                        {item.attunement && <span className="badge-cls" style={{ fontSize: '0.65rem', background: 'var(--color-secondary)' }}>ATT</span>}
                        {item.consumable && <span className="badge-cls" style={{ fontSize: '0.65rem', background: 'var(--color-accent)' }}>CON</span>}
                    </div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <div className="d-flex gap-1 justify-content-end">
                        <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        >
                        {expanded === item.id ? '▴' : '▾'}
                        </button>
                        <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item.id)}
                        >
                        ×
                        </button>
                    </div>
                    </td>
                </tr>
                {expanded === item.id && (
                    <tr>
                    <td colSpan={5} style={{ padding: '0.5rem 1rem 1rem', background: 'var(--color-surface-raised)' }}>
                        <p className="text-muted-theme mb-0" style={{ fontSize: '0.875rem' }}>
                        {item.notes || 'No notes.'}
                        </p>
                    </td>
                    </tr>
                )}
                </React.Fragment>
            ))}
            </tbody>
        </table>
        {totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between mt-3">
                <small className="text-muted-theme">
                {filtered.length} items — page {page} of {totalPages}
                </small>
                <div className="d-flex gap-1">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                    type="button"
                    key={p}
                    className={`btn btn-sm ${page === p ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setPage(p)}
                    >
                    {p}
                    </button>
                ))}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    →
                </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default InventoryTable;