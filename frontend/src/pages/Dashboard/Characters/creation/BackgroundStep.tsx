import React, { useEffect, useMemo, useState } from 'react';
import { BACKGROUNDS, Background, CUSTOM_BACKGROUND } from './backgrounds';

interface Props {
  selected?: Background;
  onSelect: (index: string) => void;
  customName: string;
  onCustomNameChange: (name: string) => void;
}

const FILTERS: { key: string; label: string; match: (b: Background) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'phb', label: "Player's Handbook", match: (b) => b.source === "Player's Handbook" || b.source.startsWith('SRD') },
  { key: 'other', label: 'Expanded', match: (b) => b.source !== "Player's Handbook" && !b.source.startsWith('SRD') },
];

const MOBILE_QUERY = '(max-width: 575.98px)';
const MOBILE_PAGE = 4;
const DESKTOP_PAGE = 10;

const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE_QUERY);
    if (!mq) return;
    const update = () => setMobile(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
};

const skillLine = (b: Background) => {
  const parts = [...b.skills];
  if (b.skillChoice) {
    const { choose, from } = b.skillChoice;
    parts.push(from === 'any' ? `any ${choose}` : `${choose} of ${from.length}`);
  }
  return parts.join(', ');
};

const shortSource = (source: string) =>
  source === "Player's Handbook" ? 'PHB' : source === "Sword Coast Adventurer's Guide" ? 'SCAG' : source === "Van Richten's Guide to Ravenloft" ? 'VRGR' : source;

// The life the hero led before adventure: skills, tools, languages and a feature.
// Browse a searchable, paginated table; open a row to read it and confirm the choice.
const BackgroundStep = ({ selected, onSelect, customName, onCustomNameChange }: Props) => {
  const isMobile = useIsMobile();
  const pageSize = isMobile ? MOBILE_PAGE : DESKTOP_PAGE;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = FILTERS.find((f) => f.key === filter)!.match;
    const list = BACKGROUNDS.filter((b) => match(b) && (!q || `${b.name} ${skillLine(b)} ${b.summary} ${b.feature.name}`.toLowerCase().includes(q)));
    // Custom is always available unless the search clearly excludes it.
    if (filter !== 'phb' && (!q || 'custom homebrew'.includes(q))) list.push(CUSTOM_BACKGROUND);
    return list;
  }, [query, filter]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * pageSize, current * pageSize + pageSize);

  // New search or filter: back to the first page.
  useEffect(() => setPage(0), [query, filter, pageSize]);

  const toggle = (index: string) => setOpenIndex((o) => (o === index ? null : index));

  const details = (b: Background) => {
    const isSelected = selected?.index === b.index;
    return (
      <div className="bg-detail" id={`bg-detail-${b.index}`}>
        <p className="bg-spotlight-summary mt-0">{b.summary}</p>
        {b.index === 'custom' && (
          <input
            type="text"
            className="form-control input-theme mb-3"
            placeholder="Name your background, e.g. Smuggler"
            value={customName}
            onChange={(e) => onCustomNameChange(e.target.value)}
            maxLength={60}
            aria-label="Custom background name"
          />
        )}
        <dl className="bg-facts">
          <div>
            <dt>Skills</dt>
            <dd>
              {b.skills.map((s) => <span key={s} className="race-chip">{s}</span>)}
              {b.skillChoice && (
                <span className="race-chip is-choice">
                  + choose {b.skillChoice.choose}
                  {b.skillChoice.from === 'any' ? ' (any)' : ` (${b.skillChoice.from.join(', ')})`}
                </span>
              )}
            </dd>
          </div>
          <div><dt>Tools</dt><dd>{b.tools}</dd></div>
          <div><dt>Languages</dt><dd>{b.languages}</dd></div>
          <div><dt>Equipment</dt><dd>{b.equipment}</dd></div>
          <div><dt>Feature</dt><dd><span><strong>{b.feature.name}.</strong> {b.feature.desc}</span></dd></div>
          <div><dt>Source</dt><dd>{b.source}</dd></div>
        </dl>
        <div className="bg-detail-actions">
          <button
            type="button"
            className="btn btn-theme-primary"
            onClick={() => {
              onSelect(b.index);
              setOpenIndex(null);
              setShowCurrent(false);
            }}
            disabled={isSelected}
          >
            {isSelected ? 'Chosen ✓' : `Choose ${b.index === 'custom' ? customName.trim() || 'Custom' : b.name}`}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => { setOpenIndex(null); setShowCurrent(false); }}>
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={`bg-current ${selected ? 'has-choice' : ''}`}>
        {selected ? (
          <>
            <span className="bg-current-label">Your background</span>
            <strong className="bg-current-name">{selected.index === 'custom' ? customName.trim() || 'Custom' : selected.name}</strong>
            <span className="bg-current-skills">{skillLine(selected) || 'No fixed skills'}</span>
            <button type="button" className="race-change-link" onClick={() => setShowCurrent((v) => !v)} aria-expanded={showCurrent}>
              {showCurrent ? 'Hide' : 'Details'}
            </button>
            {showCurrent && <div className="bg-current-detail">{details(selected)}</div>}
          </>
        ) : (
          <span className="text-muted-theme">No background chosen yet. Open one below to read it, then choose it.</span>
        )}
      </div>

      <div className="race-picker-toolbar mb-2">
        <input
          type="search"
          className="form-control input-theme race-picker-search"
          placeholder="Search name, skill or feature"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search backgrounds"
        />
        <div className="race-picker-filters" role="group" aria-label="Filter backgrounds">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={`race-filter ${filter === f.key ? 'is-active' : ''}`} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-table" aria-label="Backgrounds">
        <div className="bg-row bg-row--head">
          <span>Background</span>
          <span>Skills</span>
          <span className="bg-col-source">Source</span>
        </div>
        {shown.map((b) => {
          const open = openIndex === b.index;
          const isSelected = selected?.index === b.index;
          return (
            <div key={b.index} className={`bg-entry ${open ? 'is-open' : ''} ${isSelected ? 'is-selected' : ''}`}>
              <button
                type="button"
                className="bg-row"
               
                onClick={() => toggle(b.index)}
                aria-expanded={open}
                aria-controls={`bg-detail-${b.index}`}
              >
                <span className="bg-col-name">
                  {isSelected && <span className="bg-tick" aria-label="Chosen">✓</span>}
                  {b.index === 'custom' ? '✎ Custom' : b.name}
                </span>
                <span className="bg-col-skills">{skillLine(b)}</span>
                <span className="bg-col-source">{shortSource(b.source)}</span>
                <span className="bg-chevron" aria-hidden>{open ? '▴' : '▾'}</span>
              </button>
              {open && details(b)}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-muted-theme m-0 p-3">No background matches “{query}”.</p>}
      </div>

      {pages > 1 && (
        <nav className="bg-pager" aria-label="Background pages">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPage(current - 1)} disabled={current === 0}>
            ‹ Prev
          </button>
          <span>
            Page {current + 1} of {pages} <small>· {rows.length} backgrounds</small>
          </span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPage(current + 1)} disabled={current >= pages - 1}>
            Next ›
          </button>
        </nav>
      )}
    </div>
  );
};

export default BackgroundStep;
