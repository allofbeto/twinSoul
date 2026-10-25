import '../../styles/soundtrack.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import TrackCard from './TrackCard';
import TrackEditor from './TrackEditor';
import { useCampaignTracks, type Track } from './useTracks';

interface Props {
  campaignId?: string;
  trackId?: string;
  /** A loose link from before tracks existed. */
  legacyUrl?: string;
  /** First line of the block's text, offered as the title when promoting a legacy link. */
  suggestedTitle?: string;
  onLink: (trackId: string | undefined) => void;
}

// The music block's header: link it to a track from the campaign soundtrack,
// or add a new one on the spot.
export default function TrackPicker({ campaignId, trackId, legacyUrl, suggestedTitle, onLink }: Props) {
  const { tracks, loading, add, save } = useCampaignTracks(campaignId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'idle' | 'new' | 'edit' | 'promote'>('idle');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const linked = tracks.find((t) => t.id === trackId);
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => tracks.filter((t) => !q || t.title.toLowerCase().includes(q) || (t.mood ?? '').toLowerCase().includes(q) || t.refs.some((r) => r.name.toLowerCase().includes(q))).slice(0, 8),
    [tracks, q]
  );

  if (!campaignId) {
    return <div className="trk-note">Add this session to a campaign to build a soundtrack and tag it to NPCs and places.</div>;
  }

  if (mode === 'edit' && linked) {
    return <TrackEditor campaignId={campaignId} initial={linked} saveLabel="Update track" onCancel={() => setMode('idle')}
      onSave={async (d) => { await save(linked.id, d); setMode('idle'); }} />;
  }
  if (mode === 'new' || mode === 'promote') {
    const initial: Partial<Track> = mode === 'promote' ? { title: suggestedTitle ?? '', url: legacyUrl } : { title: query.trim() };
    return <TrackEditor campaignId={campaignId} initial={initial} saveLabel="Add to soundtrack" onCancel={() => setMode('idle')}
      onSave={async (d) => { const t = await add(d); onLink(t.id); setQuery(''); setMode('idle'); }} />;
  }

  if (linked) {
    return (
      <TrackCard track={linked} actions={
        <>
          <button type="button" className="trk-btn trk-btn--sm" onClick={() => setMode('edit')}>Edit</button>
          <button type="button" className="trk-btn trk-btn--sm" onClick={() => onLink(undefined)} title="Unlink from this block (the track stays in the soundtrack)">Unlink</button>
        </>
      } />
    );
  }

  return (
    <div className="trk-picker" ref={box}>
      {trackId && !loading && <div className="trk-note">The linked track was removed from the soundtrack.</div>}
      {legacyUrl && (
        <div className="trk-legacy">
          <a href={legacyUrl} target="_blank" rel="noopener noreferrer">♫ Loose music link ↗</a>
          <button type="button" className="trk-btn trk-btn--sm" onClick={() => setMode('promote')}>Save to soundtrack</button>
        </div>
      )}
      <input
        className="trk-in" value={query} placeholder={loading ? 'Loading soundtrack…' : 'Search the campaign soundtrack, or type a new track name…'}
        onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) { onLink(matches[0].id); setOpen(false); setQuery(''); } else if (query.trim()) setMode('new'); }
        }}
      />
      {open && (
        <div className="trk-menu" role="listbox">
          {matches.map((t) => (
            <button key={t.id} type="button" role="option" aria-selected={false} className="trk-opt" onClick={() => { onLink(t.id); setOpen(false); setQuery(''); }}>
              ♫ {t.title}
              <small>{[t.mood, t.refs.map((r) => r.name).join(', ')].filter(Boolean).join(' · ')}</small>
            </button>
          ))}
          <button type="button" className="trk-opt trk-opt--create" onClick={() => setMode('new')}>＋ New track{query.trim() ? ` “${query.trim()}”` : ''}</button>
        </div>
      )}
    </div>
  );
}
