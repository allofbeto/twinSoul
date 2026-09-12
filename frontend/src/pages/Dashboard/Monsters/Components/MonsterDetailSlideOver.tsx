import React, { useEffect, useState } from 'react';
import { getMonster } from '../../../../api/backendHelpers';
import SlideOver from '../../../../components/SlideOver';
import MonsterStatBlockContent, { MonsterStatBlockData } from './MonsterStatBlockContent';

interface Props {
  monsterId: string | null;
  onClose: () => void;
  /** When provided, an Add/Remove-to-encounter action is shown in the footer. */
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

const MonsterDetailSlideOver = ({ monsterId, onClose, isAdded, onAdd, onRemove }: Props) => {
  const [monster, setMonster] = useState<MonsterStatBlockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!monsterId) return;
    setLoading(true);
    setError('');
    const fetch = async () => {
      try {
        const res = await getMonster(monsterId);
        setMonster(res.data);
      } catch {
        setError('Could not load this monster.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [monsterId]);

  const showAction = !loading && !error && monster && (onAdd || onRemove);

  return (
    <SlideOver
      isOpen={!!monsterId}
      onClose={onClose}
      title={monster?.name || 'Monster'}
      footer={
        showAction ? (
          isAdded ? (
            <button type="button" className="btn btn-danger w-100" onClick={onRemove}>
              − Remove from Encounter
            </button>
          ) : (
            <button type="button" className="btn btn-theme-primary w-100" onClick={onAdd}>
              + Add to Encounter
            </button>
          )
        ) : undefined
      }
    >
      {loading && <p className="text-muted-theme">Loading...</p>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && monster && <MonsterStatBlockContent monster={monster} />}
    </SlideOver>
  );
};

export default MonsterDetailSlideOver;
