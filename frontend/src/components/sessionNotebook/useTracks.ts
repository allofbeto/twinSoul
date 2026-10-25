import { useCallback, useEffect, useState } from 'react';
import { createTrack, deleteTrack, getCampaignTracks, updateTrack } from '../../api/backendHelpers';

export interface TrackRef { id: string; kind: string; name: string }

export interface Track {
  id: string;
  campaign_id: string;
  title: string;
  url?: string | null;
  mood?: string | null;
  notes?: string | null;
  refs: TrackRef[];
}

export type TrackInput = Pick<Track, 'title'> & Partial<Pick<Track, 'url' | 'mood' | 'notes' | 'refs'>>;

// One shared list per campaign, so every music block, the quick view and the
// Soundtrack tab see a new or edited track immediately.
const store = new Map<string, Track[]>();
const inflight = new Map<string, Promise<Track[]>>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const load = (campaignId: string, force = false) => {
  if (!force && store.has(campaignId)) return Promise.resolve(store.get(campaignId)!);
  if (!force && inflight.has(campaignId)) return inflight.get(campaignId)!;
  const p = getCampaignTracks(campaignId)
    .then((r) => { store.set(campaignId, r.data); notify(); return r.data as Track[]; })
    .finally(() => inflight.delete(campaignId));
  inflight.set(campaignId, p);
  return p;
};

export function useCampaignTracks(campaignId?: string) {
  const [tracks, setTracks] = useState<Track[]>(() => (campaignId ? store.get(campaignId) ?? [] : []));
  const [loading, setLoading] = useState(!!campaignId && !store.has(campaignId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!campaignId) { setTracks([]); setLoading(false); return; }
    const sync = () => setTracks(store.get(campaignId) ?? []);
    listeners.add(sync);
    sync();
    load(campaignId)
      .catch(() => setError('Could not load the soundtrack.'))
      .finally(() => setLoading(false));
    return () => { listeners.delete(sync); };
  }, [campaignId]);

  const add = useCallback(async (data: TrackInput) => {
    const res = await createTrack(campaignId!, data);
    store.set(campaignId!, [...(store.get(campaignId!) ?? []), res.data]);
    notify();
    return res.data as Track;
  }, [campaignId]);

  const save = useCallback(async (id: string, data: Partial<TrackInput>) => {
    const res = await updateTrack(id, data);
    store.set(campaignId!, (store.get(campaignId!) ?? []).map((t) => (t.id === id ? res.data : t)));
    notify();
    return res.data as Track;
  }, [campaignId]);

  const remove = useCallback(async (id: string) => {
    await deleteTrack(id);
    store.set(campaignId!, (store.get(campaignId!) ?? []).filter((t) => t.id !== id));
    notify();
  }, [campaignId]);

  return { tracks, loading, error, add, save, remove };
}
