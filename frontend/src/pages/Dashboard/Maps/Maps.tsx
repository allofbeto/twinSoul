import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { createBattleMap, deleteBattleMap, getBattleMaps, getCampaigns, getBattleMap } from '../../../api/backendHelpers';
import ConfirmDialog from '../../../components/ConfirmDialog';
import BattleMapView from '../../../battlemap/BattleMapView';
import NewMapForm from '../../../battlemap/NewMapForm';
import type { BattleMap } from '../../../battlemap/map';
import '../../../styles/homebrew.css'; // theme-modal
import '../../../styles/battleMap.css';

interface Campaign { id: string; name: string }

const toSave = (m: BattleMap) => ({
  name: m.name, grid: m.grid, width: m.width, height: m.height, cells: m.cells, props: m.props,
  lighting: m.lighting, settings: m.settings, session_id: m.session_id ?? undefined,
});

// The campaign's battle maps: build new ones, open, duplicate, delete.
export default function Maps() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [maps, setMaps] = useState<BattleMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'library' | 'sessions'>('all');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BattleMap | null>(null);
  const [deleting, setDeleting] = useState(false);

  const campaignId = params.get('campaign') ?? campaigns[0]?.id ?? '';

  useEffect(() => {
    getCampaigns()
      .then((r) => setCampaigns(r.data.map((c: Campaign) => ({ id: String(c.id), name: c.name }))))
      .catch(() => setError('Could not load campaigns.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!campaignId) { setMaps([]); return; }
    let alive = true;
    getBattleMaps(campaignId)
      .then((r) => { if (alive) setMaps(r.data); })
      .catch(() => { if (alive) setError('Could not load maps.'); });
    return () => { alive = false; };
  }, [campaignId]);

  const shown = useMemo(
    () => maps.filter((m) => (filter === 'all' ? true : filter === 'library' ? !m.session_id : !!m.session_id)),
    [maps, filter],
  );

  const create = async (m: BattleMap) => {
    if (!campaignId) return;
    setBusy(true);
    setError('');
    try {
      const res = await createBattleMap(campaignId, toSave(m));
      navigate(`/dashboard/maps/${res.data.id}`);
    } catch {
      setError('Could not create the map.');
      setBusy(false);
    }
  };

  const duplicate = async (m: BattleMap) => {
    try {
      const full = (await getBattleMap(m.id!)).data as BattleMap;
      const res = await createBattleMap(campaignId, { ...toSave(full), name: `${full.name} (copy)`, session_id: undefined });
      setMaps((prev) => [res.data, ...prev]);
    } catch {
      setError('Could not duplicate the map.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteBattleMap(deleteTarget.id);
      setMaps((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Could not delete the map.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div className="bm-library">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="text-theme mb-1">Battle maps</h2>
          <p className="text-muted-theme mb-0">Rooms, terrain, cover and hazards for your fights, on square or hex grids.</p>
        </div>
        <button className="btn btn-theme-primary" disabled={!campaignId} onClick={() => setCreating(true)}>+ New map</button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card-theme p-4 text-center"><p className="text-muted-theme mb-0">Create a campaign first — battle maps belong to a campaign.</p></div>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <select className="form-select input-theme bm-campaign-select" value={campaignId} aria-label="Campaign"
              onChange={(e) => setParams({ campaign: e.target.value })}>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="bm-seg" role="radiogroup" aria-label="Show">
              {([['all', 'All'], ['library', 'Library'], ['sessions', 'From sessions']] as const).map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{label}</button>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {shown.length === 0 ? (
            <div className="card-theme p-4 text-center">
              <p className="text-muted-theme mb-2">{maps.length ? 'Nothing here with this filter.' : 'No battle maps yet.'}</p>
              {!maps.length && <button className="btn btn-theme-primary btn-sm" onClick={() => setCreating(true)}>Build your first map</button>}
            </div>
          ) : (
            <div className="bm-grid">
              {shown.map((m) => (
                <div key={m.id} className="card-theme bm-card">
                  <button type="button" className="bm-card-thumb" onClick={() => navigate(`/dashboard/maps/${m.id}`)} aria-label={`Open ${m.name}`}>
                    <BattleMapView map={{ ...m, props: m.props ?? {}, settings: m.settings ?? {} }} fit showGrid={false} />
                  </button>
                  <div className="bm-card-body">
                    <h5 className="text-theme mb-1">{m.name}</h5>
                    <small className="text-muted-theme">
                      {m.grid === 'hex' ? '⬡ Hex' : '▦ Square'} · {m.width}×{m.height}
                      {m.lighting !== 'bright' && ` · ${m.lighting === 'dim' ? '◐ Dim' : '☾ Dark'}`}
                    </small>
                    {m.session_id && <span className="bm-badge">From a session</span>}
                  </div>
                  <div className="d-flex gap-2 px-3 pb-3">
                    <button className="btn btn-theme-primary btn-sm" onClick={() => navigate(`/dashboard/maps/${m.id}`)}>Open</button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => duplicate(m)}>Duplicate</button>
                    <button className="btn btn-danger btn-sm ms-auto" onClick={() => setDeleteTarget(m)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={creating} toggle={() => setCreating(false)} size="xl" contentClassName="theme-modal bm-modal">
        <ModalHeader toggle={() => setCreating(false)}>New battle map</ModalHeader>
        <ModalBody>
          {creating && <NewMapForm busy={busy} onSubmit={create} onCancel={() => setCreating(false)} />}
        </ModalBody>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete battle map"
        message={<>Delete <strong className="text-theme">{deleteTarget?.name}</strong>? This cannot be undone.</>}
        confirming={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
