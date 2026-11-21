import { useMemo, useState } from 'react';
import type { CombatantOption, CombatantSource } from './types';

interface Props {
  options: CombatantOption[];
  loading: boolean;
  /** Characters already in the tracker can't be added twice. */
  inCombat: Set<string>;
  onAdd: (option: CombatantOption, qty: number) => void;
}

type Filter = 'all' | CombatantSource;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'beast', label: 'Beasts' },
  { key: 'npc', label: 'NPCs' },
  { key: 'character', label: 'Characters' },
];

const MAX_SHOWN = 40;

// Search the bestiary, the campaign's NPCs and the players' characters, and
// drop the result straight into the tracker.
export default function CombatantPicker({ options, loading, inCombat, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [qty, setQty] = useState(1);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: options.length, beast: 0, npc: 0, character: 0 };
    options.forEach((o) => { c[o.source] += 1; });
    return c;
  }, [options]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    // Until you search, show the party and the campaign's NPCs, not 300+ beasts.
    const browse = !q && filter === 'all';
    return options
      .filter((o) => (filter === 'all' || o.source === filter)
        && (browse ? o.source !== 'beast' : !q || o.name.toLowerCase().includes(q) || o.subtitle.toLowerCase().includes(q)))
      .sort((a, b) => {
        const starts = (o: CombatantOption) => (q && o.name.toLowerCase().startsWith(q) ? 0 : 1);
        return starts(a) - starts(b);
      });
  }, [options, filter, q]);

  const shown = results.slice(0, MAX_SHOWN);

  return (
    <div className="theatre__pick">
      <div className="theatre__pick-search">
        <input
          type="search"
          className="theatre__input"
          placeholder="Search beasts, NPCs, characters…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search for a combatant"
        />
        <div className="theatre__pick-qty" title="How many to add">
          <button type="button" className="theatre__mini" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Fewer">−</button>
          <span aria-live="polite">×{qty}</span>
          <button type="button" className="theatre__mini" onClick={() => setQty((n) => Math.min(20, n + 1))} aria-label="More">+</button>
        </div>
      </div>

      <div className="theatre__pick-tabs" role="tablist" aria-label="Kind">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`theatre__chip ${filter === f.key ? 'is-on' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <small>{counts[f.key]}</small>
          </button>
        ))}
      </div>

      <ul className="theatre__pick-list" aria-label="Results">
        {loading && options.length === 0 && <li className="theatre__roll-empty">Loading…</li>}
        {!loading && shown.length === 0 && (
          <li className="theatre__roll-empty">
            {!q && filter === 'all' ? 'No characters or NPCs in this campaign yet. Search the beasts above.' : 'No matches. Add a blank combatant below.'}
          </li>
        )}
        {shown.map((o) => {
          const taken = !!o.characterId && inCombat.has(o.characterId);
          return (
            <li key={o.key} className={`theatre__pick-item is-${o.source}`}>
              <span className="theatre__pick-avatar" style={o.imageUrl ? { backgroundImage: `url(${o.imageUrl})` } : undefined} aria-hidden="true">
                {!o.imageUrl && o.name[0]?.toUpperCase()}
              </span>
              <span className="theatre__pick-text">
                <strong>{o.name}</strong>
                <small>{o.subtitle}</small>
              </span>
              {(o.armorClass != null || o.maxHp > 0) && (
                <span className="theatre__pick-stats">
                  {o.armorClass != null && <span>AC {o.armorClass}</span>}
                  {o.maxHp > 0 && <span>{o.maxHp} HP</span>}
                </span>
              )}
              <button
                type="button"
                className="theatre__mini theatre__pick-add"
                disabled={taken}
                onClick={() => onAdd(o, qty)}
                aria-label={taken ? `${o.name} is already in combat` : `Add ${o.name}`}
              >
                {taken ? 'In' : '+'}
              </button>
            </li>
          );
        })}
        {results.length > MAX_SHOWN && <li className="theatre__roll-empty">{results.length - MAX_SHOWN} more: keep typing to narrow it down.</li>}
      </ul>
    </div>
  );
}
