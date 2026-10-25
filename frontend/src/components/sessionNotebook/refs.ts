import { getCampaignCharacters, getCampaignItems, getItems } from '../../api/backendHelpers';

/** Something a tag, mention or track can point at. */
export interface RefOption { id: string; label: string; kind: string }

export const KIND_LABEL: Record<string, string> = { character: 'character', npc: 'npc', map: 'location', item: 'item' };
export const KIND_ICON: Record<string, string> = { character: '👤', npc: '🧙', map: '🗺️', item: '🗡️' };
export const KIND_ORDER = ['character', 'npc', 'map', 'item'];



// Tiny TTL cache so typing after "@" doesn't refetch on every keystroke.
const refCache = new Map<string, { at: number; data: Promise<RefOption[]> }>();
export const loadRefs = (campaignId?: string) => {
  const key = campaignId ?? '';
  const hit = refCache.get(key);
  if (hit && Date.now() - hit.at < 5000) return hit.data;
  const data = (async () => {
    const [chars, items] = await Promise.all([
      campaignId ? getCampaignCharacters(campaignId).then((r) => r.data).catch(() => []) : Promise.resolve([]),
      (campaignId ? getCampaignItems(campaignId) : getItems()).then((r) => r.data).catch(() => []),
    ]);
    return [
      ...chars.map((c: any) => ({ id: String(c.id), label: c.name, kind: 'character' })),
      ...items
        .filter((i: any) => ['npc', 'map', 'item'].includes(i.kind ?? 'item'))
        .map((i: any) => ({ id: String(i.id), label: i.name, kind: i.kind ?? 'item' })),
    ];
  })();
  refCache.set(key, { at: Date.now(), data });
  return data;
};

