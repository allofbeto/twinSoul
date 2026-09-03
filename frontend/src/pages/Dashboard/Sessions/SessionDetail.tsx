import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessions, updateSession, deleteSession, createCampaignItem } from '../../../api/backendHelpers';
import SessionEditor from '../../../components/formComponents/editor/SessionEditor';
import type { AssetKind } from '../Theatre/Components/types';
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

type SaveStatus = 'idle' | 'saving' | 'saved';

const AUTOSAVE_DELAY = 500;

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [form, setForm] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showModal, setShowModal] = useState(false);
  const [modalFunction, setModalFunction] = useState<string | null>(null);

  const formRef = useRef<Session | null>(null);
  formRef.current = form;

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

  const handleSave = useCallback(async () => {
    const current = formRef.current;
    if (!current) return;
    try {
      const res = await updateSession(current.id, current);
      setSession(res.data);
      setIsDirty(false);
      setSaveStatus('saved');
    } catch {
      console.error('Could not save session');
      setSaveStatus('idle');
    }
  }, []);

  // Autosave: fires .5s after the last change
  useEffect(() => {
    if (!isDirty || !form) return;
    const timer = setTimeout(() => {
      handleSave();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [form, isDirty, handleSave]);

  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus('saving');
  };

  const handleCreateObject = useCallback(async (data: { name: string; kind: AssetKind }) => {
    const campaignId = formRef.current?.campaign_id;
    if (!campaignId) throw new Error('This session has no campaign — cannot create a campaign object.');
    const res = await createCampaignItem(campaignId, { name: data.name, kind: data.kind });
    return { id: String(res.data.id), title: res.data.name ?? data.name };
  }, []);

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
                style={{ fontSize: '1.25rem', fontWeight: 700, width: '100%', textAlign: 'left' }}
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); markDirty(); }}
              />
              <div className="d-flex gap-3 mt-1">
                <input
                  type="number"
                  className="stat-input-inline"
                  style={{ width: '60px', fontSize: '0.8rem' }}
                  value={form.session_number}
                  onChange={(e) => { setForm({ ...form, session_number: parseInt(e.target.value) }); markDirty(); }}
                  min={0}
                />
                <input
                  type="date"
                  className="stat-input-inline"
                  style={{ fontSize: '0.8rem' }}
                  value={form.played_on || ''}
                  onChange={(e) => { setForm({ ...form, played_on: e.target.value }); markDirty(); }}
                />
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="save-status save-status-saving">Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="save-status save-status-saved">Saved!</span>
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
          onChange={(html) => { setForm({ ...form, notes: html }); markDirty(); }}
          campaignId={form.campaign_id || undefined}
          onCreateObject={handleCreateObject}
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