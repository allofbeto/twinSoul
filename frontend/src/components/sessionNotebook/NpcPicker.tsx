import { useEffect, useMemo, useRef, useState } from 'react';
import { getCampaignItems } from '../../api/backendHelpers';
import type { CreateCampaignObject } from '../formComponents/editor/CampaignObjectMention';

export interface NpcRef { id: string; name: string }

interface Props {
  value?: NpcRef;
  onChange: (ref: NpcRef | undefined) => void;
  campaignId?: string;
  onCreateObject?: CreateCampaignObject;
}

// Pick which campaign NPC this block is for, or create a new one on the spot.
export default function NpcPicker({ value, onChange, campaignId, onCreateObject }: Props) {
  const [npcs, setNpcs] = useState<NpcRef[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!campaignId) return;
    getCampaignItems(campaignId)
      .then((r) => setNpcs(r.data.filter((i: any) => i.kind === 'npc').map((i: any) => ({ id: String(i.id), name: i.name }))))
      .catch(() => setNpcs([]));
  };

  useEffect(load, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => npcs.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 8), [npcs, q]);
  const exact = npcs.some((n) => n.name.toLowerCase() === q);

  const pick = (n: NpcRef) => { onChange(n); setQuery(''); setOpen(false); setError(''); };

  const create = async () => {
    if (!onCreateObject || !query.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const made = await onCreateObject({ name: query.trim(), kind: 'npc' });
      pick({ id: made.id, name: made.title });
      load();
    } catch {
      setError('Could not create NPC — try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!campaignId) {
    return <div className="nb-note">Add this session to a campaign to link NPCs.</div>;
  }

  if (value) {
    return (
      <div className="nb-npc-chip-row">
        <span className="nb-npc-chip" data-id={value.id} data-kind="npc" data-label={value.name}>🧙 {value.name}</span>
        <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" onClick={() => onChange(undefined)}>Change</button>
      </div>
    );
  }

  return (
    <div className="nb-npc-picker" ref={box}>
      <input
        className="nb-input"
        placeholder="Which NPC is speaking? Search or type a new name…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') {
            e.preventDefault();
            if (matches[0] && (exact || !onCreateObject)) pick(matches.find((n) => n.name.toLowerCase() === q) ?? matches[0]);
            else void create();
          }
        }}
      />
      {open && (
        <div className="nb-npc-menu" role="listbox">
          {matches.map((n) => (
            <button key={n.id} type="button" role="option" aria-selected={false} className="nb-npc-opt" onClick={() => pick(n)}>
              🧙 {n.name}
            </button>
          ))}
          {onCreateObject && query.trim() && !exact && (
            <button type="button" className="nb-npc-opt nb-npc-opt--create" disabled={busy} onClick={create}>
              {busy ? 'Creating…' : `＋ Create NPC “${query.trim()}”`}
            </button>
          )}
          {!matches.length && !query.trim() && <div className="nb-note">No NPCs in this campaign yet — type a name to create one.</div>}
          {error && <div className="nb-note" style={{ color: 'var(--color-error, #ef4444)' }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
