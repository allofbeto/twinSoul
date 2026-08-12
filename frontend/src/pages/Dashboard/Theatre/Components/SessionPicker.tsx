import { useCallback, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { Session } from './types';
import { coerceTheme } from './types';

interface SessionPickerProps {
  campaignName: string;
  sessions: Session[];
  loading?: boolean;
  theme?: string;
  onSelect: (session: Session) => void;
  onCreate: (title: string) => Promise<Session> | Session;
  onBack?: () => void;
  onExit?: () => void;
}

export default function SessionPicker({
  campaignName,
  sessions,
  loading = false,
  theme,
  onSelect,
  onCreate,
  onBack,
  onExit,
}: SessionPickerProps) {
  const { user } = useAuth();
  const activeTheme = coerceTheme(theme ?? user?.theme);

  const [wantCreate, setWantCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSessions = sessions.length > 0;
  const showCreate = !loading && (!hasSessions || wantCreate);

  const submitCreate = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await onCreate(trimmed);
      onSelect(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the session.');
      setBusy(false);
    }
  }, [title, busy, onCreate, onSelect]);

  return (
    <div className={`theatre theatre--${activeTheme} theatre--gate`} aria-label="Choose session">
      <div className="theatre__gate">
        {(onBack || onExit) && (
          <button
            type="button"
            className="theatre__icon-btn theatre__gate-exit"
            onClick={onBack ?? onExit}
            aria-label={onBack ? 'Back to campaigns' : 'Exit'}
          >
            ‹ {onBack ? 'Campaigns' : 'Exit'}
          </button>
        )}

        <div className="theatre__gate-panel">
          {loading ? (
            <p className="theatre__gate-loading">Loading sessions…</p>
          ) : showCreate ? (
            <div className="theatre__gate-create">
              <h1 className="theatre__gate-title">
                {hasSessions ? 'New session' : 'Start your first session'}
              </h1>
              <p className="theatre__gate-sub">
                {hasSessions
                  ? `Name tonight’s session in ${campaignName}.`
                  : `No sessions yet in ${campaignName}. Name one to begin.`}
              </p>

              <input
                className={`theatre__input ${error ? 'is-error' : ''}`}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                placeholder="e.g. Session 12 — The Sunless Citadel"
                aria-label="Session title"
                autoFocus
                disabled={busy}
              />
              {error && <p className="theatre__gate-error" role="alert">{error}</p>}

              <div className="theatre__gate-actions">
                {hasSessions && (
                  <button
                    type="button"
                    className="theatre__btn theatre__btn--ghost"
                    onClick={() => { setWantCreate(false); setTitle(''); setError(null); }}
                    disabled={busy}
                  >
                    ‹ Back
                  </button>
                )}
                <button
                  type="button"
                  className="theatre__btn"
                  onClick={submitCreate}
                  disabled={busy || !title.trim()}
                >
                  {busy ? 'Creating…' : 'Create & open'}
                </button>
              </div>
            </div>
          ) : (
            <div className="theatre__gate-pick">
              <h1 className="theatre__gate-title">Resume a session</h1>
              <p className="theatre__gate-sub">{campaignName} — pick up where you left off, or start fresh.</p>

              <ul className="theatre__gate-list">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="theatre__gate-item" onClick={() => onSelect(s)}>
                      <span className="theatre__gate-item-name">{s.title}</span>
                      {(s.sessionNumber != null || s.playedOn) && (
                        <span className="theatre__gate-item-desc">
                          {s.sessionNumber != null ? `Session ${s.sessionNumber}` : ''}
                          {s.sessionNumber != null && s.playedOn ? ' · ' : ''}
                          {s.playedOn ? new Date(s.playedOn).toLocaleDateString() : ''}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <button type="button" className="theatre__btn" onClick={() => { setWantCreate(true); setError(null); }}>
                + New session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}