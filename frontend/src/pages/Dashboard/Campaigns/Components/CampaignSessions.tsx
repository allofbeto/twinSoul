import React, { useEffect, useState } from 'react';
import { getSessions, createSession, updateSession, deleteSession } from '../../../../api/backendHelpers';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import RichTextEditor from '../../../../components/formComponents/RichTextEditor';

interface Session {
  id: string;
  title: string;
  notes: string;
  session_number: number;
  played_on: string;
  campaign_id: string;
}

interface Props {
  campaignId: string;
}

const CampaignSessions = ({ campaignId }: Props) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalFunction, setModalFunction] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    title: '',
    session_number: 1,
    played_on: '',
    notes: '',
    campaign_id: campaignId,
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getSessions(campaignId);
        setSessions(res.data);
      } catch {
        console.error('Could not load sessions');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [campaignId]);

  const handleCreate = async () => {
    if (!newSession.title.trim()) return;
    try {
      const res = await createSession({ ...newSession, campaign_id: campaignId });
      setSessions((prev) => [...prev, res.data]);
      setNewSession({ title: '', session_number: sessions.length + 2, played_on: '', notes: '', campaign_id: campaignId });
      setShowModal(false);
    } catch {
      console.error('Could not create session');
    }
  };

  const handleUpdate = async (session: Session) => {
    try {
      const res = await updateSession(session.id, session);
      setSessions((prev) => prev.map((s) => s.id === session.id ? res.data : s));
      setEditingSession(null);
    } catch {
      console.error('Could not update session');
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setOpenSession(null);
    } catch {
      console.error('Could not delete session');
    }
  };

  const modalSwitch = (fn: string | null) => {
    switch (fn) {
      case 'new_session':
        return {
          title: 'New Session',
          body: (
            <div>
              <div className="mb-3">
                <label className="form-label text-muted-theme">Title</label>
                <input
                  type="text"
                  className="form-control input-theme"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  placeholder="Session title..."
                />
              </div>
              <div className="d-flex gap-2 mb-3">
                <div style={{ flex: 1 }}>
                  <label className="form-label text-muted-theme">Session #</label>
                  <input
                    type="number"
                    className="form-control input-theme"
                    value={newSession.session_number}
                    onChange={(e) => setNewSession({ ...newSession, session_number: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label text-muted-theme">Played On</label>
                  <input
                    type="date"
                    className="form-control input-theme"
                    value={newSession.played_on}
                    onChange={(e) => setNewSession({ ...newSession, played_on: e.target.value })}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted-theme">Notes</label>
                <RichTextEditor
                  content={newSession.notes}
                  onChange={(html) => setNewSession({ ...newSession, notes: html })}
                />
              </div>
              <button type="button" className="btn btn-theme-primary" onClick={handleCreate}>
                Create Session
              </button>
            </div>
          ),
        };
      default:
        return null;
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="text-theme mb-0">Sessions</h5>
        <button
          type="button"
          className="btn btn-theme-primary btn-sm"
          onClick={() => { setModalFunction('new_session'); setShowModal(true); }}
        >
          + New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">No sessions yet. Create your first one!</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {sessions.map((session) => {
            const isOpen = openSession === session.id;
            const isEditing = editingSession?.id === session.id;
            const current = isEditing ? editingSession! : session;

            return (
              <div key={session.id} className="card-theme">
                {/* Accordion Header */}
                <div
                  className="d-flex align-items-center justify-content-between p-3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenSession(isOpen ? null : session.id)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge-cls" style={{ fontSize: '0.75rem', minWidth: '32px', textAlign: 'center' }}>
                      #{session.session_number}
                    </span>
                    <span className="text-theme" style={{ fontWeight: 600 }}>{session.title}</span>
                    {session.played_on && (
                      <small className="text-muted-theme">
                        {new Date(session.played_on).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                  <span className="text-muted-theme">{isOpen ? '▾' : '▸'}</span>
                </div>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="p-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    {isEditing ? (
                      <div>
                        <div className="d-flex gap-2 mb-3">
                          <div style={{ flex: 2 }}>
                            <label className="form-label text-muted-theme">Title</label>
                            <input
                              type="text"
                              className="form-control input-theme"
                              value={current.title}
                              onChange={(e) => setEditingSession({ ...current, title: e.target.value })}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="form-label text-muted-theme">Session #</label>
                            <input
                              type="number"
                              className="form-control input-theme"
                              value={current.session_number}
                              onChange={(e) => setEditingSession({ ...current, session_number: parseInt(e.target.value) })}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="form-label text-muted-theme">Played On</label>
                            <input
                              type="date"
                              className="form-control input-theme"
                              value={current.played_on || ''}
                              onChange={(e) => setEditingSession({ ...current, played_on: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-muted-theme">Notes</label>
                          <RichTextEditor
                            content={current.notes || ''}
                            onChange={(html) => setEditingSession({ ...current, notes: html })}
                          />
                        </div>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-theme-primary btn-sm" onClick={() => handleUpdate(current)}>
                            Save
                          </button>
                          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingSession(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="mb-3"
                          dangerouslySetInnerHTML={{ __html: session.notes || '<p style="color:var(--color-text-muted);font-style:italic">No notes yet.</p>' }}
                        />
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingSession(session)}>
                            ✎ Edit
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(session.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

export default CampaignSessions;