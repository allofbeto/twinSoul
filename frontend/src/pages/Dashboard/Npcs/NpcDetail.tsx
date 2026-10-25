import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getItem, updateItem, deleteItem } from '../../../api/backendHelpers';
import NpcBuilder, { npcFromApi, npcPayload, type NpcData } from './Components/NpcBuilder';
import '../../../styles/npc.css';

const NpcDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initial, setInitial] = useState<NpcData | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getItem(id!)
      .then((res) => { setInitial(npcFromApi(res.data)); setOwnerId(res.data.user_id); })
      .catch(() => setError('Could not load NPC.'))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async (data: NpcData) => {
    await updateItem(id!, { ...npcPayload(data), campaign_id: data.campaign_id || null });
  };

  const remove = async () => {
    try {
      await deleteItem(id!);
      navigate('/dashboard/npcs');
    } catch {
      setError('Could not delete NPC.');
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!initial) return <p className="text-muted-theme">{error || 'NPC not found.'}</p>;

  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      <NpcBuilder key={id} mode="edit" initial={initial} isOwner={ownerId === user?.id} onSave={save} onDelete={remove} />
    </>
  );
};

export default NpcDetail;
