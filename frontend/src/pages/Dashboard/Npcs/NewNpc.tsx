import { useNavigate } from 'react-router-dom';
import { createCampaignItem } from '../../../api/backendHelpers';
import NpcBuilder, { blankNpc, npcPayload, type NpcData } from './Components/NpcBuilder';

const NewNpc = () => {
  const navigate = useNavigate();

  const handleCreate = async (data: NpcData) => {
    // NPCs are created through the campaign-scoped, owner-only endpoint.
    const res = await createCampaignItem(data.campaign_id, { ...npcPayload(data), kind: 'npc' });
    navigate(`/dashboard/npcs/${res.data.id}`);
  };

  return <NpcBuilder mode="new" initial={blankNpc()} isOwner onCreate={handleCreate} />;
};

export default NewNpc;
