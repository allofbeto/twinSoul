import React, { useEffect, useState } from 'react';
import { getItems, deleteItem } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';
import '../../../styles/npc.css';

interface Npc {
  id: string;
  name: string;
  kind: string;
  disposition: string;
  challenge_rating: string | null;
  max_hp: number;
  current_hp: number;
  armor_class: number;
}

const Npcs = () => {
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchNpcs = async () => {
    try {
      const res = await getItems();
      setNpcs(res.data.filter((i: Npc) => i.kind === 'npc'));
    } catch {
      setError('Could not load NPCs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNpcs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this NPC?')) return;
    try {
      await deleteItem(id);
      setNpcs(npcs.filter((n) => n.id !== id));
    } catch {
      setError('Could not delete NPC.');
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">NPCs</h2>
          <p className="text-muted-theme mb-0">Your cast of non-player characters.</p>
        </div>
        <button
          className="btn btn-theme-primary"
          onClick={() => navigate('/dashboard/npcs/new')}
        >
          + New NPC
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {npcs.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">No NPCs yet. Create your first one!</p>
        </div>
      ) : (
        <div className="row g-3">
          {npcs.map((npc) => (
            <div className="col-md-6 col-lg-4" key={npc.id}>
              <div className="card-theme p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h5 className="text-theme mb-0">{npc.name}</h5>
                    <span className={`npc-disposition-badge npc-disposition-${npc.disposition}`}>
                      {npc.disposition}
                    </span>
                  </div>
                  <p className="text-muted-theme mb-2">
                    {npc.challenge_rating ? `CR ${npc.challenge_rating}` : 'No CR set'}
                  </p>
                  <div className="d-flex gap-3">
                    <small className="text-muted-theme">HP: {npc.current_hp}/{npc.max_hp}</small>
                    <small className="text-muted-theme">AC: {npc.armor_class}</small>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button
                    className="btn btn-theme-primary btn-sm"
                    onClick={() => navigate(`/dashboard/npcs/${npc.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(npc.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Npcs;
