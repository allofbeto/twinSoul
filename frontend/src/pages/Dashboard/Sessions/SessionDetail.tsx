import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessions, updateSession, deleteSession } from '../../../api/backendHelpers';
import SessionEditor from '../../../components/formComponents/editor/SessionEditor';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

interface Session {
  id: string;
  campaign_id: string | null;
  user_id: string;
  title: string;
  notes: string;
  session_number: number;
  played_on: string;
}

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [form, setForm] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalFunction, setModalFunction] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getSessions();
        const found = res.data.find((s: Session) => s.id === id);
        if (found) {
          setSession(found);
          setForm(found);
        }
      } catch {
        console.error('Could not load session');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await updateSession(form.id, form);
      setSession(res.data);
      setIsDirty(false);
    } catch {
      console.error('Could not save session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    try {
      await deleteSession(session.id);
      navigate('/dashboard/sessions');
    } catch {
      console.error('Could not delete session');
    }
  };

  const modalSwitch = (fn: string | null) => {
    switch (fn) {
      case 'delete':
        return {
          title: 'Delete Session',
          body: (
            <div>
              <p className="text-muted-theme mb-4">
                Are you sure you want to delete <strong className="text-theme">{session?.title}</strong>? This cannot be undone.
              </p>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          ),
        };
      default:
        return null;
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">Session not found.</p>;

  return (
    <div>
      {/* Sticky Top Bar */}
      <div className="sticky-save-bar">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate('/dashboard/sessions')}
            >
              ← Back
            </button>
            <div>
              <input
                type="text"
                className="stat-input-inline"
                style={{ fontSize: '1.25rem', fontWeight: 700 }}
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); setIsDirty(true); }}
              />
              <div className="d-flex gap-3 mt-1">
                <input
                  type="number"
                  className="stat-input-inline"
                  style={{ width: '60px', fontSize: '0.8rem' }}
                  value={form.session_number}
                  onChange={(e) => { setForm({ ...form, session_number: parseInt(e.target.value) }); setIsDirty(true); }}
                  min={0}
                />
                <input
                  type="date"
                  className="stat-input-inline"
                  style={{ fontSize: '0.8rem' }}
                  value={form.played_on || ''}
                  onChange={(e) => { setForm({ ...form, played_on: e.target.value }); setIsDirty(true); }}
                />
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            {isDirty && (
              <button
                type="button"
                className="btn btn-theme-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
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

      {/* Editor */}
      <div className="mt-3">
        <SessionEditor
          content={form.notes || ''}
          onChange={(html) => { setForm({ ...form, notes: html }); setIsDirty(true); }}
          campaignId={form.campaign_id || undefined}
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

export default SessionDetail;