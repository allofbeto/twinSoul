import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import SegmentedTabs from './SegmentedTabs';
import { SpellOrigin } from '../../spellTypes';
import { addInventoryItem, getCampaignItems, getInventoryItems, searchCampaignItems } from '../../../../../api/backendHelpers';
import '../../../../../styles/homebrew.css'; // theme-modal

interface OriginItem {
  id: string;
  name: string;
  kind: string;
  notes?: string | null;
  categories?: string[];
  inInventory: boolean;
}

interface Props {
  isOpen: boolean;
  characterId: string;
  campaignId: string | null;
  campaignName?: string;
  /** The campaign's DM sees every item; everyone else has to search by name. */
  isDm: boolean;
  /** The chosen item, or null to add spells without tying them to one. */
  onPick: (origin: SpellOrigin | null) => void;
  onClose: () => void;
}

// Creatures and encounters aren't things spells come "from".
const HIDDEN_KINDS = new Set(['monster', 'encounter']);

// Players type this many characters of a name before the campaign reveals a match.
const MIN_REVEAL_CHARS = 4;

// "Other" spells come from somewhere: a wand, a gift from an NPC, a boon.
// Find that object among the campaign's and the character's items, or make it
// (it goes into the character's inventory, which links it to their campaign).
const SpellOriginDialog = ({ isOpen, characterId, campaignId, campaignName, isDm, onPick, onClose }: Props) => {
  const [mode, setMode] = useState<'find' | 'create'>('find');
  const [inventory, setInventory] = useState<OriginItem[]>([]);
  const [campaign, setCampaign] = useState<OriginItem[]>([]); // the DM's full list
  const [revealed, setRevealed] = useState<OriginItem[]>([]); // a player's name matches
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ name: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toItem = (i: { id: string; name: string; kind?: string; notes?: string | null; categories?: string[] }, inInventory: boolean): OriginItem =>
    ({ id: i.id, name: i.name, kind: i.kind || 'item', notes: i.notes, categories: i.categories, inInventory });

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setMode('find'); setQuery(''); setDraft({ name: '', notes: '' }); setError(''); setLoading(true);
    setInventory([]); setCampaign([]); setRevealed([]);
    Promise.allSettled([
      isDm && campaignId ? getCampaignItems(campaignId) : Promise.resolve({ data: [] }),
      getInventoryItems(characterId),
    ]).then(([all, mine]) => {
      if (cancelled) return;
      if (mine.status === 'fulfilled') {
        setInventory((mine.value.data as OriginItem[]).filter((i) => !HIDDEN_KINDS.has(i.kind)).map((i) => toItem(i, true)));
      }
      if (all.status === 'fulfilled') {
        setCampaign((all.value.data as OriginItem[]).filter((i) => !HIDDEN_KINDS.has(i.kind)).map((i) => toItem(i, false)));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, characterId, campaignId, isDm]);

  // Players: nothing from the campaign shows until they've typed 4+ characters
  // of a name, and then only the items whose name contains what they typed.
  const typed = query.trim();
  useEffect(() => {
    if (!isOpen || isDm || !campaignId) return undefined;
    if (typed.length < MIN_REVEAL_CHARS) { setRevealed([]); return undefined; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCampaignItems(campaignId, typed)
        .then((res) => { if (!cancelled) setRevealed((res.data as OriginItem[]).map((i) => toItem(i, false))); })
        .catch(() => { if (!cancelled) setRevealed([]); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isDm, campaignId, typed]);

  const results = useMemo(() => {
    const q = typed.toLowerCase();
    const matches = (i: OriginItem) => !q
      || i.name.toLowerCase().includes(q)
      || (isDm && ((i.notes || '').toLowerCase().includes(q) || (i.categories || []).some((c) => c.toLowerCase().includes(q))));
    const byId: Record<string, OriginItem> = {};
    // Own inventory wins over the campaign copy of the same item.
    [...(isDm ? campaign : revealed), ...inventory].forEach((i) => { if (matches(i)) byId[i.id] = i; });
    return Object.values(byId).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, campaign, revealed, typed, isDm]);

  const needMore = !isDm && !!campaignId && typed.length < MIN_REVEAL_CHARS;

  const create = async () => {
    const name = draft.name.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await addInventoryItem(characterId, { name, notes: draft.notes.trim() || undefined, categories: ['Misc'], kind: 'item' });
      onPick({ id: res.data.id, name: res.data.name || name, kind: 'item' });
    } catch {
      setError("Couldn't create that item. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered scrollable fullscreen="sm" contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>Which item or source?</ModalHeader>
      <ModalBody>
        <div className="sheet sheet-form">
          <p className="sheet-form-hint">
            Say what these spells come from: a magic item, a gift from an NPC, a boon. Pick one from your campaign or make a new one.
          </p>
          <SegmentedTabs
            options={[{ key: 'find', label: 'Find existing' }, { key: 'create', label: 'Create new' }]}
            value={mode}
            onChange={setMode}
            aria-label="Find or create"
          />

          {mode === 'find' ? (
            <>
              <input
                className="form-control input-theme"
                placeholder={isDm ? 'Search items and objects…' : 'Type at least 4 letters of the name…'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search items"
              />
              <div className="sheet-pick-list" role="listbox" aria-label="Items">
                {loading && <p className="sheet-empty">Loading…</p>}
                {needMore && (
                  <p className="sheet-form-hint">
                    {typed.length === 0
                      ? 'Campaign items stay hidden until you type at least 4 letters of their name.'
                      : `Keep typing: ${MIN_REVEAL_CHARS - typed.length} more ${MIN_REVEAL_CHARS - typed.length === 1 ? 'letter' : 'letters'} to look in the campaign.`}
                  </p>
                )}
                {!loading && !needMore && results.length === 0 && (
                  <p className="sheet-empty">
                    {isDm && inventory.length + campaign.length === 0 ? 'Nothing in your campaign or inventory yet.' : 'No match.'}{' '}
                    <button type="button" className="sheet-link" onClick={() => { setDraft({ ...draft, name: query }); setMode('create'); }}>Create it</button>
                  </p>
                )}
                {results.map((i) => (
                  <button key={i.id} type="button" role="option" aria-selected={false} className="sheet-pick" onClick={() => onPick({ id: i.id, name: i.name, kind: i.kind })}>
                    <span className="sheet-pick-name">
                      {i.name}
                      {i.kind !== 'item' && <span className="sheet-chip">{i.kind}</span>}
                      <span className="sheet-chip">{i.inInventory ? 'Your inventory' : 'Campaign'}</span>
                    </span>
                    {(i.categories?.length || i.notes) && (
                      <span className="sheet-pick-desc">{[(i.categories || []).join(', '), i.notes].filter(Boolean).join(' · ')}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="sheet-form-row">
                <span className="sheet-label">Name</span>
                <input className="form-control input-theme" value={draft.name} maxLength={60} placeholder="e.g. Staff of the Magi" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="sheet-form-row">
                <span className="sheet-label">Notes (optional)</span>
                <textarea className="form-control input-theme" rows={3} maxLength={1000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </label>
              <p className="sheet-form-hint">
                {campaignId
                  ? `Saved to this character's inventory and linked to ${campaignName || 'the campaign'}.`
                  : "Saved to this character's inventory. It isn't in a campaign yet, so it can't be linked to one."}
              </p>
              {error && <p className="sheet-form-hint" role="alert" style={{ color: 'var(--sheet-danger)' }}>{error}</p>}
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        {mode === 'find' ? (
          <button type="button" className="btn btn-outline-secondary w-100" onClick={() => onPick(null)}>
            Skip: not from a specific item
          </button>
        ) : (
          <button type="button" className="btn btn-theme-primary w-100" onClick={create} disabled={!draft.name.trim() || saving}>
            {saving ? 'Creating…' : 'Create and continue'}
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default SpellOriginDialog;
