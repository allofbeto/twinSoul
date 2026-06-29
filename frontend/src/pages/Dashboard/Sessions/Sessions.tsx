import React, { useEffect, useState } from 'react';
import { getSessions, deleteSession } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';
import DataTable, { Column } from '../../../components/DataTable';

interface Session {
  id: string;
  campaign_id: string | null;
  user_id: string;
  title: string;
  notes: string;
  session_number: number;
  played_on: string;
}

type ViewMode = 'list' | 'grid';

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getSessions();
        setSessions(res.data);
      } catch {
        setError('Could not load sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError('Could not delete session.');
    }
  };

  const columns: Column<Session>[] = [
    {
      key: 'session_number',
      label: '#',
      width: '8%',
      sortable: true,
      render: (s) => (
        <span className="badge-cls" style={{ fontSize: '0.75rem' }}>#{s.session_number}</span>
      ),
    },
    {
      key: 'title',
      label: 'TITLE',
      width: '35%',
      sortable: true,
      render: (s) => (
        <span
          style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => navigate(`/dashboard/sessions/${s.id}`)}
        >
          {s.title}
        </span>
      ),
    },
    {
      key: 'campaign_id',
      label: 'CAMPAIGN',
      width: '25%',
      render: (s) => (
        <span className="text-muted-theme" style={{ fontSize: '0.875rem' }}>
          {s.campaign_id ? (
            <span
              style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
              onClick={() => navigate(`/dashboard/campaigns/${s.campaign_id}`)}
            >
              View Campaign
            </span>
          ) : 'Standalone'}
        </span>
      ),
    },
    {
      key: 'played_on',
      label: 'DATE',
      width: '20%',
      sortable: true,
      render: (s) => (
        <span className="text-muted-theme" style={{ fontSize: '0.875rem' }}>
          {s.played_on ? new Date(s.played_on).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '12%',
      align: 'right',
      render: (s) => (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => handleDelete(s.id)}
        >
          ×
        </button>
      ),
    },
  ];

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Sessions</h2>
          <p className="text-muted-theme mb-0">All your session notes.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {/* View toggle */}
          <div className="d-flex gap-1">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {sessions.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">No sessions yet.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="card-theme p-4">
          <DataTable
            columns={columns}
            data={sessions}
            keyField="id"
            pageSize={10}
            searchable
            searchPlaceholder="Search sessions..."
            emptyMessage="No sessions found."
            expandable={(s) => (
              <div
                className="text-muted-theme"
                style={{ fontSize: '0.875rem' }}
                dangerouslySetInnerHTML={{
                  __html: s.notes
                    ? s.notes.substring(0, 200) + (s.notes.length > 200 ? '...' : '')
                    : 'No notes.'
                }}
              />
            )}
          />
        </div>
      ) : (
        /* Grid view */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="card-theme p-4"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
            >
              {/* Session number badge */}
              <span
                className="badge-cls"
                style={{ fontSize: '0.7rem', position: 'absolute', top: '1rem', right: '1rem' }}
              >
                #{session.session_number}
              </span>

              {/* Icon */}
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>

              {/* Title */}
              <h5 className="text-theme mb-1" style={{ paddingRight: '2rem' }}>{session.title}</h5>

              {/* Date */}
              {session.played_on && (
                <small className="text-muted-theme d-block mb-2">
                  {new Date(session.played_on).toLocaleDateString()}
                </small>
              )}

              {/* Campaign */}
              <small className="text-muted-theme">
                {session.campaign_id ? '📖 Campaign' : '📝 Standalone'}
              </small>

              {/* Delete button */}
              <button
                type="button"
                className="btn btn-sm btn-danger"
                style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}
                onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sessions;