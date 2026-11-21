import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaignItem } from '../../../api/backendHelpers';
import NpcBuilder, { blankNpc, npcFromApi, npcPayload, type NpcData } from './Components/NpcBuilder';
import NpcStart from './Components/NpcStart';
import { guideFor, midHp, scoresFor, type Role } from './crDefaults';

// A blank NPC with the numbers a creature of this CR (and role) usually has.
const scratchNpc = (cr: string, role: Role | null): NpcData => {
  const guide = guideFor(cr);
  const hp = guide ? midHp(guide) : 10;
  return {
    ...blankNpc(),
    challenge_rating: cr,
    armor_class: guide?.ac ?? 10,
    max_hp: hp,
    current_hp: hp,
    speed: '30 ft.',
    ...(role ? scoresFor(role, cr) : {}),
  };
};

type Stage = { npc: NpcData; fromAi: boolean; run: number } | null;

const NewNpc = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>(null);

  const handleCreate = async (data: NpcData) => {
    // NPCs are created through the campaign-scoped, owner-only endpoint.
    const res = await createCampaignItem(data.campaign_id, { ...npcPayload(data), kind: 'npc' });
    navigate(`/dashboard/npcs/${res.data.id}`);
  };

  if (!stage) {
    return (
      <NpcStart
        onDraft={(npc) => setStage({ npc: { ...npcFromApi(npc), campaign_id: '' }, fromAi: true, run: Date.now() })}
        onScratch={(cr, role) => setStage({ npc: scratchNpc(cr, role), fromAi: false, run: Date.now() })}
      />
    );
  }

  return (
    <>
      {stage.fromAi && (
        <div className="npcb-banner" role="note">
          <span>Drafted by AI. Read it over and change anything before you create the NPC.</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setStage(null)}>Start over</button>
        </div>
      )}
      <NpcBuilder key={stage.run} mode="new" initial={stage.npc} isOwner onCreate={handleCreate} />
    </>
  );
};

export default NewNpc;
