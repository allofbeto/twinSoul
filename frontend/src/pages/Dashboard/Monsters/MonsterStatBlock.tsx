import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMonster } from '../../../api/backendHelpers';
import MonsterStatBlockContent, { MonsterStatBlockData } from './Components/MonsterStatBlockContent';
import '../../../styles/statBlock.css';

const MonsterStatBlock = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monster, setMonster] = useState<MonsterStatBlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMonster(id!);
        setMonster(res.data);
      } catch {
        setError('Could not load this monster.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (error || !monster) return <p className="text-muted-theme">{error || 'Monster not found.'}</p>;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div className="sticky-save-bar">
        <div className="d-flex align-items-center justify-content-between">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate('/dashboard/monsters')}
          >
            ← Back
          </button>
          <span className="text-muted-theme" style={{ fontSize: '0.75rem' }}>{monster.source}</span>
        </div>
      </div>

      <div className="card-theme p-4 mb-4">
        <MonsterStatBlockContent monster={monster} />
      </div>
    </div>
  );
};

export default MonsterStatBlock;
