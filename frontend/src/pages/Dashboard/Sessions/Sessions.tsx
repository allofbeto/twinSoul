import React, { useEffect, useMemo, useState } from 'react';
import { getSessions, getCampaigns, createSession, deleteSession } from '../../../api/backendHelpers';
import { Link, useNavigate } from 'react-router-dom';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { TrashIcon } from '../../../components/sessionNotebook/Icons';
import { notebookStats, notesPreview } from '../../../components/sessionNotebook/model';
import { campaignColor } from '../../../utils/campaignColor';
import '../../../styles/sessionsPage.css';

interface Session {
  id: string;
  campaign_id: string | null;
  user_id: string;
  title: string;
  notes: string;
  session_number: number;
  played_on: string;
  updated_at?: string;
}

type ViewMode = 'list' | 'grid';
type SortKey = 'number' | 'title' | 'date' | 'campaign';
type SortDir = 'asc' | 'desc';
type When = 'all' | 'played' | 'upcoming' | 'undated';

const SORT_LABELS: Record<SortKey, string> = { number: 'Session #', title: 'Title', date: 'Date', campaign: 'Campaign' };
const PREFS_KEY = 'sessions-page-prefs';

// Remembered per browser so the page opens the way you left it; never required.
const loadPrefs = (): { sortKey?: SortKey; sortDir?: SortDir; viewMode?: ViewMode } => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
};

/* ---------- tiny helpers & icons ---------- */


// played_on is a plain date: build it in local time so it doesn't slip a day across time zones.
const parseDay = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const fmtDay = (iso?: string) => (iso ? parseDay(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

const ago = (iso?: string) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const Svg = ({ children, size = 14 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const SearchIcon = () => <Svg><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Svg>;
const CalendarIcon = () => <Svg size={13}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></Svg>;
const BookIcon = () => <Svg size={13}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></Svg>;
const GridIcon = () => <Svg size={16}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>;
const ListIcon = () => <Svg size={16}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>;
const ArrowIcon = ({ dir }: { dir: SortDir }) => <Svg size={15}>{dir === 'asc' ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M19 12l-7 7-7-7" />}</Svg>;

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [prefs] = useState(loadPrefs);
  const [viewMode, setViewMode] = useState<ViewMode>(prefs.viewMode ?? 'grid');
  const [query, setQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all'); // 'all' | 'standalone' | campaign id
  const [when, setWhen] = useState<When>('all');
  const [sortKey, setSortKey] = useState<SortKey>(prefs.sortKey ?? 'number');
  const [sortDir, setSortDir] = useState<SortDir>(prefs.sortDir ?? 'asc');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCampaign, setNewCampaign] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getSessions();
        setSessions(res.data);
        try {
          const c = await getCampaigns();
          setCampaigns(c.data.filter((x: any) => x.role !== 'player'));
        } catch {
          /* sessions can still be created standalone */
        }
      } catch {
        setError('Could not load sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError('Could not delete session.');
    } finally {
      setConfirmId(null);
    }
  };

  const nextNumber = () => sessions.reduce((m, x) => Math.max(m, x.session_number || 0), 0) + 1;

  const openCreate = () => {
    setNewTitle(`Session ${nextNumber()}`);
    setNewCampaign('');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const next = nextNumber();
      const res = await createSession({
        title: newTitle.trim() || `Session ${next}`,
        session_number: next,
        ...(newCampaign ? { campaign_id: newCampaign } : {}),
      });
      navigate(`/dashboard/sessions/${res.data.id}`);
    } catch {
      setError('Could not create session.');
      setCreating(false);
      setShowCreate(false);
    }
  };

  const campaignName = (id: string | null) => campaigns.find((c) => c.id === id)?.name;
  // The campaign's chosen accent (set on its page), or its auto color.
  const colorOf = (id: string) => campaignColor(id, campaigns.find((c) => c.id === id)?.color);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ sortKey, sortDir, viewMode })); } catch { /* ignore */ }
  }, [sortKey, sortDir, viewMode]);

  // Per-session counts + excerpt, parsed once, plus a lowercased haystack for search.
  const info = useMemo(() => {
    const m = new Map<string, ReturnType<typeof notebookStats> & { hay: string }>();
    sessions.forEach((x) => {
      const st = notebookStats(x.notes);
      const camp = campaigns.find((c) => c.id === x.campaign_id)?.name ?? (x.campaign_id ? '' : 'standalone');
      m.set(x.id, { ...st, hay: [x.title, `#${x.session_number}`, camp, notesPreview(x.notes, 100000)].join(' ').toLowerCase() });
    });
    return m;
  }, [sessions, campaigns]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const list = sessions.filter((x) => {
      if (campaignFilter === 'standalone' ? x.campaign_id : campaignFilter !== 'all' && x.campaign_id !== campaignFilter) return false;
      if (when === 'played' && !(x.played_on && x.played_on <= today)) return false;
      if (when === 'upcoming' && !(x.played_on && x.played_on > today)) return false;
      if (when === 'undated' && x.played_on) return false;
      return !q || (info.get(x.id)?.hay ?? '').includes(q);
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const name = (x: Session) => campaigns.find((c) => c.id === x.campaign_id)?.name ?? '';
    return list.sort((a, b) => {
      let r = 0;
      if (sortKey === 'number') r = (a.session_number || 0) - (b.session_number || 0);
      else if (sortKey === 'title') r = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      else if (sortKey === 'campaign') r = name(a).localeCompare(name(b)) || (a.session_number || 0) - (b.session_number || 0);
      else {
        // Undated sessions always sink to the bottom, whichever way the date sorts.
        if (!a.played_on || !b.played_on) return a.played_on ? -1 : b.played_on ? 1 : 0;
        r = a.played_on.localeCompare(b.played_on);
      }
      return r * dir;
    });
  }, [sessions, campaigns, info, query, campaignFilter, when, sortKey, sortDir]);

  const filtersActive = !!query.trim() || campaignFilter !== 'all' || when !== 'all';
  const clearFilters = () => { setQuery(''); setCampaignFilter('all'); setWhen('all'); };

  // Header clicks in the table drive the same sort as the toolbar.
  const sortBy = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  const deleteButton = (s: Session) => (
    <button
      type="button"
      className={`ses-del ${confirmId === s.id ? 'is-confirm' : ''}`}
      title="Delete session" aria-label={`Delete ${s.title}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirmId === s.id) handleDelete(s.id); else setConfirmId(s.id); }}
      onBlur={() => setConfirmId((c) => (c === s.id ? null : c))}
    >
      {confirmId === s.id ? 'Delete?' : <TrashIcon />}
    </button>
  );

  const progress = (s: Session) => {
    const st = info.get(s.id);
    if (!st || !st.beats) return null;
    return (
      <div className="ses-progress" title={`${st.done} of ${st.beats} beats done`}>
        <div className="ses-bar"><div style={{ width: `${(100 * st.done) / st.beats}%` }} /></div>
        <span>{st.done}/{st.beats}</span>
      </div>
    );
  };

  const sortableHead = (k: SortKey, label: string) => (
    <th className={sortKey === k ? 'is-sorted' : ''} aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => sortBy(k)}>{label}{sortKey === k && <ArrowIcon dir={sortDir} />}</button>
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Sessions</h2>
          <p className="text-muted-theme mb-0">Plan, run and look back on every session.</p>
        </div>
        <button type="button" className="btn btn-theme-primary" onClick={openCreate}>+ New Session</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {sessions.length > 0 && (
        <>
          <div className="ses-toolbar">
            <div className="ses-search">
              <SearchIcon />
              <input type="search" className="ses-in" aria-label="Search sessions" placeholder="Search titles, notes, campaigns…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="ses-in" aria-label="Filter by campaign" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
              <option value="all">All campaigns</option>
              <option value="standalone">Standalone</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="ses-in" aria-label="Filter by date" value={when} onChange={(e) => setWhen(e.target.value as When)}>
              <option value="all">Any date</option>
              <option value="played">Played</option>
              <option value="upcoming">Upcoming</option>
              <option value="undated">No date</option>
            </select>
            <div className="ses-toolbar-end">
              <select className="ses-in" aria-label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <option key={k} value={k}>Sort: {SORT_LABELS[k]}</option>)}
              </select>
              <button type="button" className="ses-icon-btn" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                title={sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'} aria-label={`Sort direction: ${sortDir === 'asc' ? 'ascending' : 'descending'}`}>
                <ArrowIcon dir={sortDir} />
              </button>
              <div className="ses-seg" role="group" aria-label="View">
                <button type="button" className={viewMode === 'grid' ? 'is-on' : ''} onClick={() => setViewMode('grid')} title="Card view" aria-pressed={viewMode === 'grid'}><GridIcon /></button>
                <button type="button" className={viewMode === 'list' ? 'is-on' : ''} onClick={() => setViewMode('list')} title="Table view" aria-pressed={viewMode === 'list'}><ListIcon /></button>
              </div>
            </div>
          </div>

          <p className="ses-count">
            <span>{filtersActive ? `${visible.length} of ${sessions.length} sessions` : `${sessions.length} session${sessions.length === 1 ? '' : 's'}`}</span>
            {filtersActive && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear filters</button>}
          </p>
        </>
      )}

      {sessions.length === 0 ? (
        <div className="ses-empty">
          <strong>No sessions yet</strong>
          <p>Create your first session to start planning scenes, beats and the music that goes with them.</p>
          <button type="button" className="btn btn-theme-primary" onClick={openCreate}>+ New Session</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="ses-empty">
          <strong>Nothing matches</strong>
          <p>Try a different search or loosen the filters.</p>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="ses-table-wrap">
          <table className="ses-table">
            <thead>
              <tr>
                {sortableHead('number', '#')}
                {sortableHead('title', 'Session')}
                {sortableHead('campaign', 'Campaign')}
                {sortableHead('date', 'Date')}
                <th>Progress</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const st = info.get(s.id);
                const cname = campaignName(s.campaign_id);
                return (
                  <tr key={s.id} className="ses-row" onClick={() => navigate(`/dashboard/sessions/${s.id}`)}>
                    <td className="ses-no-cell">{s.session_number ? `#${s.session_number}` : '—'}</td>
                    <td>
                      <div className="ses-row-title">
                        <Link to={`/dashboard/sessions/${s.id}`} onClick={(e) => e.stopPropagation()}>{s.title}</Link>
                        {st?.excerpt && <small>{st.excerpt}</small>}
                      </div>
                    </td>
                    <td>
                      {s.campaign_id ? (
                        <span className="ses-chip"><span className="ses-dot" style={{ background: colorOf(s.campaign_id) }} />{cname ?? 'Campaign'}</span>
                      ) : <span className="ses-chip is-standalone">Standalone</span>}
                    </td>
                    <td>{fmtDay(s.played_on) || '—'}</td>
                    <td>{progress(s)}</td>
                    <td>{ago(s.updated_at)}</td>
                    <td className="ses-actions">{deleteButton(s)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ses-grid">
          {visible.map((s) => {
            const st = info.get(s.id);
            const cname = campaignName(s.campaign_id);
            return (
              <Link
                key={s.id} to={`/dashboard/sessions/${s.id}`}
                className={`ses-card ${s.campaign_id ? '' : 'is-standalone'}`}
                style={s.campaign_id ? ({ ['--ses-accent' as any]: colorOf(s.campaign_id) } as React.CSSProperties) : undefined}
              >
                <div className="ses-card-top">
                  <span className="ses-no">{s.session_number ? `Session ${s.session_number}` : 'Session'}</span>
                  {deleteButton(s)}
                </div>
                <div className="ses-title">{s.title}</div>
                <p className={`ses-excerpt ${st?.excerpt ? '' : 'is-empty'}`}>{st?.excerpt || 'No notes yet.'}</p>
                {progress(s)}
                <div className="ses-meta">
                  <span><CalendarIcon />{fmtDay(s.played_on) || 'No date'}</span>
                  <span className="is-campaign"><BookIcon />{s.campaign_id ? (cname ?? 'Campaign') : 'Standalone'}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} toggle={() => setShowCreate(false)}>
        <ModalHeader toggle={() => setShowCreate(false)}>New Session</ModalHeader>
        <ModalBody>
          <label className="form-label text-theme" htmlFor="new-session-title">Title</label>
          <input
            id="new-session-title" className="form-control mb-3" value={newTitle} autoFocus
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <label className="form-label text-theme" htmlFor="new-session-campaign">Campaign</label>
          <select
            id="new-session-campaign" className="form-select mb-1" value={newCampaign}
            onChange={(e) => setNewCampaign(e.target.value)}
          >
            <option value="">Standalone (no campaign)</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <small className="text-muted-theme d-block mb-4">
            A campaign unlocks character and item tagging, the theatre and encounters.
          </small>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-theme-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create session'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default Sessions;
