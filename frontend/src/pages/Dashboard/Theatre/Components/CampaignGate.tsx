import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { Campaign } from './types';
import { coerceTheme } from './types';

interface CampaignGateProps {
  campaigns: Campaign[];
  /** True while the campaign list is still being fetched. */
  loading?: boolean;
  /** Optional override. Defaults to the signed-in user's theme (users.theme). */
  theme?: string;
  /** Called with the chosen campaign — for an existing pick, or a freshly created one. */
  onSelect: (campaign: Campaign) => void;
  /** Create a campaign (POST to your API) and resolve with the created record. */
  onCreate: (name: string) => Promise<Campaign> | Campaign;
  onExit?: () => void;
}

// Show the filter only once the list is long enough to warrant it.
const FILTER_THRESHOLD = 3;

export default function CampaignGate({
  campaigns,
  loading = false,
  theme,
  onSelect,
  onCreate,
  onExit,
}: CampaignGateProps) {
    const { user } = useAuth();
    const activeTheme = coerceTheme(theme ?? user?.theme);

    const [wantCreate, setWantCreate] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const hasCampaigns = campaigns.length > 0;
    // No campaigns → the create form is the only option.
    const showCreate = !loading && (!hasCampaigns || wantCreate);

    // Set of ids that match the query. We render ALL campaigns and toggle a
    // hidden class rather than filtering the array — that keeps every <li>
    // mounted so CSS can animate the ones that drop out.
    const matchIds = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null; // null = everything matches
        return new Set(campaigns.filter((c) => c.name.toLowerCase().includes(q)).map((c) => c.id));
    }, [campaigns, query]);

    const matchCount = matchIds ? matchIds.size : campaigns.length;

    const submitCreate = useCallback(async () => {
        const trimmed = name.trim();
        if (!trimmed || busy) return;
        setBusy(true);
        setError(null);
        try {
        const created = await onCreate(trimmed);
        onSelect(created); // drop straight into the theatre with the new campaign
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the campaign.');
        setBusy(false);
        }
    }, [name, busy, onCreate, onSelect]);

    // near your other hooks
    const listRef = useRef<HTMLUListElement>(null);
    const [lockedHeight, setLockedHeight] = useState<number | null>(null);

    // lock the natural height once, after first paint of the pick view
    useEffect(() => {
    if (!showCreate && !loading && lockedHeight === null && listRef.current) {
        setLockedHeight(listRef.current.scrollHeight);
    }
    }, [showCreate, loading, lockedHeight]);

  return (
    <div className={`theatre theatre--${activeTheme} theatre--gate`} aria-label="Choose campaign">
      <div className="theatre__gate">
        {onExit && (
          <button type="button" className="theatre__icon-btn theatre__gate-exit" onClick={onExit} aria-label="Exit">
            ‹ Exit
          </button>
        )}

        <div className="theatre__gate-panel">
          {loading ? (
            <p className="theatre__gate-loading">Loading campaigns…</p>
          ) : showCreate ? (
            <div className="theatre__gate-create">
              <h1 className="theatre__gate-title">
                {hasCampaigns ? 'New campaign' : 'Create your first campaign'}
              </h1>
              <p className="theatre__gate-sub">
                {hasCampaigns
                  ? 'Name it — you can flesh it out later.'
                  : 'You don’t have any campaigns yet. Name one to get started.'}
              </p>

              <input
                className={`theatre__input ${error ? 'is-error' : ''}`}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                placeholder="e.g. Curse of Strahd"
                aria-label="Campaign name"
                autoFocus
                disabled={busy}
              />
              {error && <p className="theatre__gate-error" role="alert">{error}</p>}

              <div className="theatre__gate-actions">
                {hasCampaigns && (
                  <button
                    type="button"
                    className="theatre__btn theatre__btn--ghost"
                    onClick={() => { setWantCreate(false); setName(''); setError(null); }}
                    disabled={busy}
                  >
                    ‹ Back
                  </button>
                )}
                <button
                  type="button"
                  className="theatre__btn"
                  onClick={submitCreate}
                  disabled={busy || !name.trim()}
                >
                  {busy ? 'Creating…' : 'Create & enter'}
                </button>
              </div>
            </div>
          ) : (
            <div className="theatre__gate-pick">
              <h1 className="theatre__gate-title">Choose your campaign</h1>
              <p className="theatre__gate-sub">Pick up where you left off, or start something new.</p>

              {campaigns.length > FILTER_THRESHOLD && (
                <input
                  className="theatre__input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search campaigns…"
                  aria-label="Search campaigns"
                  autoFocus
                />
              )}

              <ul className="theatre__gate-list">
                <li
                  className={`theatre__gate-empty ${matchCount === 0 ? '' : 'is-hidden'}`}
                  aria-hidden={matchCount !== 0}
                >
                  No campaigns match “{query}”.
                </li>
                {campaigns.map((c) => {
                  const hidden = matchIds !== null && !matchIds.has(c.id);
                  return (
                    <li
                      key={c.id}
                      className={`theatre__gate-item-row ${hidden ? 'is-hidden' : ''}`}
                      aria-hidden={hidden}
                    >
                      <button
                        type="button"
                        className="theatre__gate-item"
                        onClick={() => onSelect(c)}
                        tabIndex={hidden ? -1 : 0}
                      >
                        <span className="theatre__gate-item-name">{c.name}</span>
                        {c.description && <span className="theatre__gate-item-desc">{c.description}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                className="theatre__btn"
                onClick={() => { setWantCreate(true); setError(null); setQuery(''); }}
              >
                + New campaign
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}