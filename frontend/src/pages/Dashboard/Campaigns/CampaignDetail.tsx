import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign, updateCampaign, getPlayers, removePlayer } from '../../../api/backendHelpers';
import DataTable from '../../../components/DataTable';
import AddPlayerForm from '../../Players/AddPlayerForm';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface Character {
  id: string;
  name: string;
  race: string;
  level: number;
}

interface Player {
  id: string;
  active: boolean;
  character: Character | null;
  user_email: string;
  user_name: string;
  user_id: string;
}

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Campaign | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [campaignRes, playersRes] = await Promise.all([
          getCampaign(id!),
          getPlayers(id!),
        ]);
        setForm(campaignRes.data);
        setPlayers(playersRes.data);
      } catch {
        setError('Could not load campaign.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form!, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCampaign(id!, form!);
      setSuccess('Campaign updated!');
      setIsDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (playerId: string) => {
    if (!window.confirm('Remove this player from the campaign?')) return;
    try {
      await removePlayer(id!, playerId);
      setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, active: false } : p));
    } catch {
      setError('Could not remove player.');
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">Campaign not found.</p>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Sticky Top Bar */}
        <div className="sticky-save-bar">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h2 className="text-theme mb-0">{form.name}</h2>
              <small className="text-muted-theme">{form.status}</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {success && <span className="text-success">{success}</span>}
              {error && <span className="text-danger">{error}</span>}
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/dashboard/campaigns')}
              >
                ← Back
              </button>
              {isDirty && (
                <button type="submit" className="btn btn-theme-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="card-theme p-4 mb-4">
          <div className="mb-3">
            <label className="form-label text-muted-theme">Name</label>
            <input
              type="text"
              name="name"
              className="form-control input-theme"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label text-muted-theme">Description</label>
            <textarea
              name="description"
              className="form-control input-theme"
              value={form.description || ''}
              onChange={handleChange}
              rows={4}
            />
          </div>
          <div className="mb-3">
            <label className="form-label text-muted-theme">Status</label>
            <select
              name="status"
              className="form-select input-theme"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </form>

      {/* Players */}
      <div className="card-theme p-4 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
  <h5 className="text-theme mb-0">Players</h5>
  <button
    type="button"
    className="btn btn-theme-primary btn-sm"
    onClick={() => setShowAddPlayer(!showAddPlayer)}
  >
    {showAddPlayer ? 'Cancel' : '+ Add Player'}
  </button>
</div>

{showAddPlayer && (
  <AddPlayerForm
    campaignId={id!}
    onPlayerAdded={() => {
      setShowAddPlayer(false);
      // refetch players
      getPlayers(id!).then((res) => setPlayers(res.data));
    }}
  />
)}

        <DataTable
          columns={[
            {
              key: 'user_name',
              label: 'PLAYER',
              width: '30%',
              sortable: true,
              render: (player: Player) => (
                <span
                  style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/campaigns/${id}/players/${player.id}`)}
                >
                  {player.user_name}
                </span>
              ),
            },
            {
              key: 'user_email',
              label: 'EMAIL',
              width: '30%',
              render: (player: Player) => (
                <span className="text-muted-theme" style={{ fontSize: '0.875rem' }}>
                  {player.user_email}
                </span>
              ),
            },
            {
              key: 'active',
              label: 'STATUS',
              width: '20%',
              align: 'center' as const,
              render: (player: Player) => (
                <span className="badge-cls" style={{
                  fontSize: '0.7rem',
                  background: player.active ? 'var(--color-success)' : 'var(--color-text-muted)'
                }}>
                  {player.active ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              width: '20%',
              align: 'right' as const,
              render: (player: Player) => player.active ? (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeactivate(player.id)}
                >
                  Remove
                </button>
              ) : null,
            },
          ]}
          data={players}
          keyField="id"
          pageSize={10}
          searchable
          searchPlaceholder="Search players..."
          emptyMessage="No players yet."
        />

        {players.filter((p) => !p.active).length > 0 && (
          <div className="mt-2">
            <small className="text-muted-theme">
              {players.filter((p) => !p.active).length} inactive player{players.filter((p) => !p.active).length > 1 ? 's' : ''}
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;