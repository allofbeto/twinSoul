import '../../styles/soundtrack.css';
import { KIND_ICON } from './refs';
import type { Track } from './useTracks';

// A track as a read-only card. Tag chips carry data-id/data-kind so the
// notebook's hover card and run-mode drawer work on them like any other tag.
export default function TrackCard({ track, actions }: { track: Track; actions?: React.ReactNode }) {
  return (
    <div className="trk-card">
      <div className="trk-card-head">
        <span className="trk-note-icon" aria-hidden="true">♫</span>
        <strong className="trk-title">{track.title}</strong>
        {track.mood && <span className="trk-mood">{track.mood}</span>}
        <span className="trk-card-end">
          {track.url && <a className="trk-play" href={track.url} target="_blank" rel="noopener noreferrer">▶ Play ↗</a>}
          {actions}
        </span>
      </div>
      {track.refs?.length > 0 && (
        <div className="trk-tag-chips">
          {track.refs.map((r) => (
            <span key={r.id} className="trk-chip" data-id={r.id} data-kind={r.kind} data-label={r.name}>{KIND_ICON[r.kind] ?? '📌'} {r.name}</span>
          ))}
        </div>
      )}
      {track.notes && <p className="trk-notes">{track.notes}</p>}
    </div>
  );
}
