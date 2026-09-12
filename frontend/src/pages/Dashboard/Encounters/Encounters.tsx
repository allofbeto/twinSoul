import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEncounters, getCampaigns, getSessions, deleteEncounter } from '../../../api/backendHelpers';
import ConfirmDialog from '../../../components/ConfirmDialog';

interface EncounterMonster {
  id: string;
  quantity: number;
  xp: number;
}

interface EncounterPhase {
  id: string;
  encounter_monsters: EncounterMonster[];
}

interface Encounter {
  id: string;
  name: string;
  notes: string | null;
  campaign_id: string | null;
  session_id: string | null;
  encounter_phases: EncounterPhase[];
}

interface Campaign {
  id: string;
  name: string;
}

interface Session {
  id: string;
  title: string;
  session_number: number;
}

const Encounters = () => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Encounter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [encountersRes, campaignsRes, sessionsRes] = await Promise.all([
          getEncounters(),
          getCampaigns(),
          getSessions(),
        ]);
        setEncounters(encountersRes.data);
        setCampaigns(campaignsRes.data);
        setSessions(sessionsRes.data);
      } catch {
        setError('Could not load encounters.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const campaignName = useMemo(() => {
    const map = new Map(campaigns.map((c) => [c.id, c.name]));
    return (campaignId: string | null) => (campaignId ? map.get(campaignId) || 'Unknown campaign' : 'Standalone');
  }, [campaigns]);

  const sessionLabel = useMemo(() => {
    const map = new Map(sessions.map((s) => [s.id, s]));
    return (sessionId: string | null) => {
      if (!sessionId) return null;
      const s = map.get(sessionId);
      return s ? `#${s.session_number} — ${s.title}` : 'Unknown session';
    };
  }, [sessions]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEncounter(deleteTarget.id);
      setEncounters((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Could not delete encounter.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Encounters</h2>
          <p className="text-muted-theme mb-0">Build and budget combat encounters for your campaigns.</p>
        </div>
        <button
          className="btn btn-theme-primary"
          onClick={() => navigate('/dashboard/encounters/new')}
        >
          + New Encounter
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {encounters.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">No encounters yet. Create your first one!</p>
        </div>
      ) : (
        <div className="row g-3">
          {encounters.map((encounter) => {
            const monsters = encounter.encounter_phases.flatMap((p) => p.encounter_monsters);
            const monsterCount = monsters.reduce((sum, m) => sum + m.quantity, 0);
            const totalXp = monsters.reduce((sum, m) => sum + m.xp * m.quantity, 0);
            const phaseCount = encounter.encounter_phases.length;
            return (
              <div className="col-md-6 col-lg-4" key={encounter.id}>
                <div className="card-theme p-4 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <h5 className="text-theme mb-1">{encounter.name}</h5>
                    <p className="text-muted-theme mb-1">{campaignName(encounter.campaign_id)}</p>
                    {sessionLabel(encounter.session_id) && (
                      <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>
                        🎲 {sessionLabel(encounter.session_id)}
                      </p>
                    )}
                    <div className="d-flex gap-3">
                      <small className="text-muted-theme">
                        {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}
                      </small>
                      <small className="text-muted-theme">Monsters: {monsterCount}</small>
                      <small className="text-muted-theme">XP: {totalXp.toLocaleString()}</small>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-theme-primary btn-sm"
                      onClick={() => navigate(`/dashboard/encounters/${encounter.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteTarget(encounter)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Encounter"
        message={<>Are you sure you want to delete <strong className="text-theme">{deleteTarget?.name}</strong>? This cannot be undone.</>}
        confirming={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Encounters;
