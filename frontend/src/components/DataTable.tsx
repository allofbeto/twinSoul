import React, { useState } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
  expandable?: (row: T) => React.ReactNode;
}

function DataTable<T>({
  columns,
  data,
  keyField,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  toolbar,
  expandable,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filtered = data
    .filter((row) => {
      if (!searchable || !search) return true;
      return columns.some((col) => {
        const val = (row as any)[col.key];
        return val && String(val).toLowerCase().includes(search.toLowerCase());
      });
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      const aVal = String((a as any)[sortBy] || '');
      const bVal = String((b as any)[sortBy] || '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      {/* Toolbar */}
      {(searchable || toolbar) && (
        <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
          {searchable && (
            <input
              type="text"
              className="form-control input-theme"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: '220px' }}
            />
          )}
          {toolbar && <div style={{ marginLeft: 'auto' }}>{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
          {expandable && <col style={{ width: '60px' }} />}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-muted-theme"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  textAlign: col.align || 'left',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                {col.label}
                {col.sortable && sortBy === col.key ? (sortDir === 'asc' ? ' ▴' : ' ▾') : ''}
              </th>
            ))}
            {expandable && <th />}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (expandable ? 1 : 0)}
                className="text-muted-theme"
                style={{ padding: '1rem', textAlign: 'center' }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {paginated.map((row) => {
            const key = String((row as any)[keyField]);
            const isExpanded = expanded === key;
            return (
              <React.Fragment key={key}>
                <tr className="skill-row">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0.5rem',
                        textAlign: col.align || 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                  {expandable && (
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setExpanded(isExpanded ? null : key)}
                      >
                        {isExpanded ? '▴' : '▾'}
                      </button>
                    </td>
                  )}
                </tr>
                {expandable && isExpanded && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      style={{ padding: '0.5rem 1rem 1rem', background: 'var(--color-surface-raised)' }}
                    >
                      {expandable(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <small className="text-muted-theme">
            {filtered.length} results — page {page} of {totalPages}
          </small>
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                type="button"
                key={p}
                className={`btn btn-sm ${page === p ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >→</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;