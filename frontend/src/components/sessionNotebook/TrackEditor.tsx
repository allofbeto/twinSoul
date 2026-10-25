import '../../styles/soundtrack.css';
import { useState } from 'react';
import RefTagInput from './RefTagInput';
import type { Track, TrackInput } from './useTracks';

const MOODS = ['Calm', 'Tense', 'Combat', 'Mystery', 'Sorrow', 'Triumph', 'Whimsy', 'Eerie', 'Travel', 'Tavern', 'Ritual'];

interface Props {
  campaignId?: string;
  initial?: Partial<Track>;
  saveLabel?: string;
  onSave: (data: TrackInput) => Promise<void>;
  onCancel: () => void;
}

export default function TrackEditor({ campaignId, initial, saveLabel = 'Save track', onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [mood, setMood] = useState(initial?.mood ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [refs, setRefs] = useState(initial?.refs ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) { setError('Give the track a title.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({ title: title.trim(), url: url.trim() || null, mood: mood.trim() || null, notes: notes.trim() || null, refs });
    } catch {
      setError('Could not save the track.');
      setBusy(false);
    }
  };

  return (
    <div className="trk-editor" onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
      <div className="trk-grid">
        <label className="trk-f"><span>Title</span>
          <input className="trk-in" autoFocus value={title} placeholder="Freg’s Pond Waltz" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="trk-f"><span>Mood</span>
          <input className="trk-in" list="trk-moods" value={mood} placeholder="Calm, Tense…" onChange={(e) => setMood(e.target.value)} />
          <datalist id="trk-moods">{MOODS.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label className="trk-f trk-span"><span>Link</span>
          <input className="trk-in" value={url} placeholder="YouTube, Spotify, a file URL…" onChange={(e) => setUrl(e.target.value)} />
        </label>
        <div className="trk-f trk-span"><span>Theme for</span>
          <RefTagInput value={refs} onChange={setRefs} campaignId={campaignId} />
        </div>
        <label className="trk-f trk-span"><span>Notes</span>
          <input className="trk-in" value={notes} placeholder="When to play it, how it should feel…" onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      {error && <div className="trk-error">{error}</div>}
      <div className="trk-actions">
        <button type="button" className="trk-btn trk-btn--primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : saveLabel}</button>
        <button type="button" className="trk-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
