import React, { useEffect, useState } from 'react';
import { getSessions, getCampaigns, createSession, deleteSession } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import DataTable, { Column } from '../../../components/DataTable';
import { TrashIcon } from '../../../components/sessionNotebook/Icons';
import { notesPreview } from '../../../components/sessionNotebook/model';

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
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCampaign, setNewCampaign] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getSessions();
        setSessions(res.data);
        try {
          const c = await getCampaigns();
          setCampaigns(c.data.filter((x: any) => x.role !== 'player'));
        } catch {
          /* sessions can still be created standalone */
        }
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

  const openCreate = () => {
    const next = sessions.reduce((m, x) => Math.max(m, x.session_number || 0), 0) + 1;
    setNewTitle(`Session ${next}`);
    setNewCampaign('');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const next = sessions.reduce((m, x) => Math.max(m, x.session_number || 0), 0) + 1;
      const res = await createSession({
        title: newTitle.trim() || `Session ${next}`,
        session_number: next,
        ...(newCampaign ? { campaign_id: newCampaign } : {}),
      });
      navigate(`/dashboard/sessions/${res.data.id}`);
    } catch {
      setError('Could not create session.');
      setCreating(false);
      setShowCreate(false);
    }
  };

  const campaignName = (id: string | null) => campaigns.find((c) => c.id === id)?.name;

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
              {campaignName(s.campaign_id) ?? 'View Campaign'}
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
          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
          title="Delete session"
          aria-label="Delete session"
          onClick={() => handleDelete(s.id)}
        >
          <TrashIcon />
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
          <button type="button" className="btn btn-theme-primary" onClick={openCreate}>
            + New Session
          </button>
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
          <p className="text-muted-theme">No sessions yet.</p>
          <button type="button" className="btn btn-theme-primary" onClick={openCreate}>
            + New Session
          </button>
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
              <div className="text-muted-theme" style={{ fontSize: '0.875rem' }}>
                {notesPreview(s.notes) || 'No notes.'}
              </div>
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
                {session.campaign_id ? `📖 ${campaignName(session.campaign_id) ?? 'Campaign'}` : '📝 Standalone'}
              </small>

              {/* Delete button */}
              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}
                title="Delete session"
                aria-label="Delete session"
                onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} toggle={() => setShowCreate(false)}>
        <ModalHeader toggle={() => setShowCreate(false)}>New Session</ModalHeader>
        <ModalBody>
          <label className="form-label text-theme" htmlFor="new-session-title">Title</label>
          <input
            id="new-session-title" className="form-control mb-3" value={newTitle} autoFocus
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <label className="form-label text-theme" htmlFor="new-session-campaign">Campaign</label>
          <select
            id="new-session-campaign" className="form-select mb-1" value={newCampaign}
            onChange={(e) => setNewCampaign(e.target.value)}
          >
            <option value="">Standalone (no campaign)</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <small className="text-muted-theme d-block mb-4">
            A campaign unlocks character and item tagging, the theatre and encounters.
          </small>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-theme-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create session'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default Sessions;