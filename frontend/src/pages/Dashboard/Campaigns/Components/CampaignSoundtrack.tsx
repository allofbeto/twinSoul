import { useMemo, useState } from 'react';
import TrackCard from '../../../../components/sessionNotebook/TrackCard';
import TrackEditor from '../../../../components/sessionNotebook/TrackEditor';
import { KIND_ICON } from '../../../../components/sessionNotebook/refs';
import { useCampaignTracks, type Track } from '../../../../components/sessionNotebook/useTracks';
import '../../../../styles/soundtrack.css';

const KIND_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'npc', label: `${KIND_ICON.npc} NPCs` },
  { key: 'map', label: `${KIND_ICON.map} Places` },
  { key: 'item', label: `${KIND_ICON.item} Items` },
  { key: 'character', label: `${KIND_ICON.character} Characters` },
  { key: 'untagged', label: 'Untagged' },
];

// The campaign's living soundtrack: every track, who or where it belongs to,
// and the mood to reach for. Music blocks in sessions pull from here.
const CampaignSoundtrack = ({ campaignId }: { campaignId: string }) => {
  const { tracks, loading, error, add, save, remove } = useCampaignTracks(campaignId);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [mood, setMood] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const moods = useMemo(() => Array.from(new Set(tracks.map((t) => t.mood).filter(Boolean) as string[])).sort(), [tracks]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter((t: Track) => {
      if (kind === 'untagged' ? t.refs.length > 0 : kind !== 'all' && !t.refs.some((r) => r.kind === kind)) return false;
      if (mood && t.mood !== mood) return false;
      if (!q) return true;
      return [t.title, t.mood ?? '', t.notes ?? '', ...t.refs.map((r) => r.name)].join(' ').toLowerCase().includes(q);
    });
  }, [tracks, query, kind, mood]);

  if (loading) return <p className="text-muted-theme">Loading…</p>;

  return (
    <div className="card-theme p-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 className="text-theme mb-1">Soundtrack</h5>
          <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>
            Themes for your NPCs, places and moments. Add music to a session and tag it here — it builds up as the campaign goes on.
          </p>
        </div>
        <button type="button" className="btn btn-theme-primary" onClick={() => setEditing('new')}>＋ New track</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {editing === 'new' && (
        <div className="mb-3">
          <TrackEditor campaignId={campaignId} saveLabel="Add to soundtrack" onCancel={() => setEditing(null)}
            onSave={async (d) => { await add(d); setEditing(null); }} />
        </div>
      )}

      {tracks.length > 0 && (
        <div className="trk-bar">
          <input className="trk-in" placeholder="Search tracks, moods, NPCs…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="trk-filter" role="group" aria-label="Filter by tag type">
            {KIND_FILTERS.map((f) => (
              <button key={f.key} type="button" className={kind === f.key ? 'is-on' : ''} onClick={() => setKind(f.key)}>{f.label}</button>
            ))}
          </div>
          {moods.length > 0 && (
            <select className="trk-in" style={{ width: 150 }} value={mood} aria-label="Mood" onChange={(e) => setMood(e.target.value)}>
              <option value="">Any mood</option>
              {moods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="trk-list">
        {shown.map((t) => (
          editing === t.id ? (
            <TrackEditor key={t.id} campaignId={campaignId} initial={t} saveLabel="Update track" onCancel={() => setEditing(null)}
              onSave={async (d) => { await save(t.id, d); setEditing(null); }} />
          ) : (
            <TrackCard key={t.id} track={t} actions={
              <>
                <button type="button" className="trk-btn trk-btn--sm" onClick={() => setEditing(t.id)}>Edit</button>
                <button type="button" className={`trk-btn trk-btn--sm trk-btn--danger`} onBlur={() => setConfirm(null)}
                  onClick={() => (confirm === t.id ? (setConfirm(null), remove(t.id)) : setConfirm(t.id))}>
                  {confirm === t.id ? 'Delete?' : 'Delete'}
                </button>
              </>
            } />
          )
        ))}
        {tracks.length === 0 && editing !== 'new' && (
          <div className="text-center text-muted-theme p-4">
            No music yet. Add a track here, or add a Music block to a session and tag it to an NPC or place.
          </div>
        )}
        {tracks.length > 0 && shown.length === 0 && <div className="text-muted-theme">No tracks match those filters.</div>}
      </div>
    </div>
  );
};

export default CampaignSoundtrack;
