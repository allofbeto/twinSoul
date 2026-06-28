import React, { useState } from 'react';
import { searchUser, addPlayer } from '../../api/backendHelpers';

interface FoundUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Props {
  campaignId: string;
  onPlayerAdded: () => void;
}

const AddPlayerForm = ({ campaignId, onPlayerAdded }: Props) => {
  const [email, setEmail] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setError('');
    setFoundUser(null);
    try {
      const res = await searchUser(email);
      setFoundUser(res.data);
    } catch {
      setError('No user found with that email.');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!foundUser) return;
    setAdding(true);
    setError('');
    try {
      await addPlayer(campaignId, { user_id: foundUser.id });
      setEmail('');
      setFoundUser(null);
      onPlayerAdded();
    } catch {
      setError('Could not add player.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card-theme p-3 mb-3">
      <h6 className="text-theme mb-3">Add Player</h6>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex gap-2 mb-3">
        <input
          type="email"
          className="form-control input-theme"
          placeholder="Search by email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          type="button"
          className="btn btn-theme-primary btn-sm"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {foundUser && (
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            }}>
              {foundUser.first_name[0]}{foundUser.last_name[0]}
            </div>
            <div>
              <p className="text-theme mb-0" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {foundUser.first_name} {foundUser.last_name}
              </p>
              <small className="text-muted-theme">{foundUser.email}</small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-theme-primary btn-sm"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? 'Adding...' : 'Add to Campaign'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AddPlayerForm;