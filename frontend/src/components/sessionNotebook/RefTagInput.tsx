import { useEffect, useMemo, useRef, useState } from 'react';
import { KIND_ICON, KIND_LABEL, KIND_ORDER, loadRefs, type RefOption } from './refs';
import type { TrackRef } from './useTracks';

interface Props {
  value: TrackRef[];
  onChange: (next: TrackRef[]) => void;
  campaignId?: string;
}

// Chips for the NPCs, places, items and characters a track is the theme for.
export default function RefTagInput({ value, onChange, campaignId }: Props) {
  const [options, setOptions] = useState<RefOption[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { loadRefs(campaignId).then(setOptions).catch(() => setOptions([])); }, [campaignId]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set(value.map((v) => v.id));
    return options
      .filter((o) => !taken.has(o.id) && o.label.toLowerCase().includes(q))
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
      .slice(0, 8);
  }, [options, query, value]);

  const add = (o: RefOption) => { onChange([...value, { id: o.id, kind: o.kind, name: o.label }]); setQuery(''); };

  return (
    <div className="trk-tags" ref={box}>
      <div className="trk-tag-chips">
        {value.map((r) => (
          <span key={r.id} className="trk-chip">
            {KIND_ICON[r.kind] ?? '📌'} {r.name}
            <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onChange(value.filter((x) => x.id !== r.id))}>×</button>
          </span>
        ))}
        <input
          className="trk-tag-input" value={query} placeholder={value.length ? 'Tag another…' : 'Tag an NPC, place, item or character…'}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0]); }
            if (e.key === 'Backspace' && !query && value.length) onChange(value.slice(0, -1));
            if (e.key === 'Escape') setOpen(false);
          }}
        />
      </div>
      {open && (
        <div className="trk-menu" role="listbox">
          {matches.map((o) => (
            <button key={o.id} type="button" role="option" aria-selected={false} className="trk-opt" onClick={() => add(o)}>
              {KIND_ICON[o.kind] ?? '📌'} {o.label} <small>{KIND_LABEL[o.kind] ?? o.kind}</small>
            </button>
          ))}
          {!matches.length && <div className="trk-note">{campaignId ? 'Nothing to tag — create NPCs and places in the campaign first.' : 'Add this to a campaign to tag its NPCs and places.'}</div>}
        </div>
      )}
    </div>
  );
}
