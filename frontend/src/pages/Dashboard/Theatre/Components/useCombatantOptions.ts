import { useEffect, useMemo, useState } from 'react';
import { getCampaignCharacters, getMonsterOptions } from '../../../../api/backendHelpers';
import type { CombatantOption } from './types';

interface MonsterRow {
  id: string;
  name: string;
  creature_type: string | null;
  challenge_rating: string | null;
  armor_class: number | null;
  hit_points: number | null;
  dexterity: number | null;
  image_url: string | null;
}

// The bestiary is the same for everyone and rarely changes: fetch it once.
let monsterRequest: Promise<MonsterRow[]> | null = null;
const loadMonsters = () => {
  if (!monsterRequest) {
    monsterRequest = getMonsterOptions()
      .then((res) => res.data as MonsterRow[])
      .catch(() => { monsterRequest = null; return []; });
  }
  return monsterRequest;
};

/**
 * What the DM can drop into the initiative tracker: the SRD bestiary and the
 * campaign's own homebrew monsters ("beasts"), the campaign's NPCs, and the
 * characters players have made in this campaign.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCombatantOptions(campaignId: string | null, enabled: boolean, rawItems: any[]) {
  const [monsters, setMonsters] = useState<MonsterRow[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !campaignId) { setCharacters([]); return undefined; }
    let alive = true;
    setLoading(true);
    Promise.all([loadMonsters(), getCampaignCharacters(campaignId).then((r) => r.data).catch(() => [])])
      .then(([m, c]) => { if (alive) { setMonsters(m); setCharacters(c); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [campaignId, enabled]);

  const options = useMemo<CombatantOption[]>(() => {
    const party: CombatantOption[] = characters.map((c) => ({
      key: `character:${c.id}`,
      source: 'character',
      name: c.name,
      subtitle: [c.level ? `Level ${c.level}` : '', (c.classes || []).join(' / ')].filter(Boolean).join(' · ') || 'Character',
      armorClass: c.armor_class ?? null,
      maxHp: c.current_hp ?? c.max_hp ?? 0,
      dexterity: c.dexterity ?? null,
      imageUrl: c.profile_image?.url,
      isEnemy: false,
      characterId: String(c.id),
    }));

    const fromItem = (i: any, source: 'npc' | 'beast', isEnemy: boolean, label: string): CombatantOption => ({
      key: `${source === 'npc' ? 'npc' : 'homebrew'}:${i.id}`,
      source,
      name: i.name ?? 'Unnamed',
      subtitle: [label, i.challenge_rating ? `CR ${i.challenge_rating}` : '', source === 'npc' ? i.disposition : ''].filter(Boolean).join(' · '),
      armorClass: i.armor_class ?? null,
      maxHp: i.max_hp ?? 0,
      dexterity: i.dexterity ?? null,
      imageUrl: i.image_url ?? undefined,
      isEnemy,
      itemId: String(i.id),
    });
    const npcs = rawItems.filter((i) => i.kind === 'npc').map((i) => fromItem(i, 'npc', i.disposition === 'hostile', 'NPC'));
    const homebrew = rawItems.filter((i) => i.kind === 'monster').map((i) => fromItem(i, 'beast', true, 'Homebrew'));

    const beasts: CombatantOption[] = monsters.map((m) => ({
      key: `beast:${m.id}`,
      source: 'beast',
      name: m.name,
      subtitle: [m.challenge_rating ? `CR ${m.challenge_rating}` : '', m.creature_type].filter(Boolean).join(' · '),
      armorClass: m.armor_class,
      maxHp: m.hit_points ?? 0,
      dexterity: m.dexterity,
      imageUrl: m.image_url ?? undefined,
      isEnemy: true,
      monsterId: m.id,
    }));

    return [...party, ...npcs, ...homebrew, ...beasts];
  }, [characters, monsters, rawItems]);

  return { options, loading };
}
