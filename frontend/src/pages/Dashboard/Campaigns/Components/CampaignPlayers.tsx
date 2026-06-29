import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayers, removePlayer } from '../../../../api/backendHelpers';
import DataTable from '../../../../components/DataTable';
import AddPlayerForm from '../../../Players/AddPlayerForm';

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

interface Props {
  campaignId: string;
  players: Player[];
  setPlayers: (players: Player[]) => void;
}

const CampaignPlayers = ({ campaignId, players, setPlayers }: Props) => {
  const navigate = useNavigate();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [error, setError] = useState('');

  const handleDeactivate = async (playerId: string) => {
    if (!window.confirm('Remove this player from the campaign?')) return;
    try {
      await removePlayer(campaignId, playerId);
      setPlayers(players.map((p) => p.id === playerId ? { ...p, active: false } : p));
    } catch {
      setError('Could not remove player.');
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card-theme p-4">
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
            campaignId={campaignId}
            onPlayerAdded={() => {
              setShowAddPlayer(false);
              getPlayers(campaignId).then((res) => setPlayers(res.data));
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
                  onClick={() => navigate(`/dashboard/campaigns/${campaignId}/players/${player.id}`)}
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

export default CampaignPlayers;