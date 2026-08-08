import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { useAuth } from '../../../context/AuthContext';
import '../../../styles/SessionTheatre.css';

/* ------------------------------------------------------------------ *
 * Types — these are the seams you wire to your real Session data.
 * ------------------------------------------------------------------ */

export type TheatreTheme = 'default' | 'dos' | 'magic';

const THEATRE_THEMES: TheatreTheme[] = ['default', 'dos', 'magic'];
const coerceTheme = (t?: string): TheatreTheme =>
  (t && (THEATRE_THEMES as string[]).includes(t) ? (t as TheatreTheme) : 'default');

const PANE_MIN = 200;
const PANE_MAX = 560;
const PANE_DEFAULT = 300;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type AssetKind = 'art' | 'map' | 'npc' | 'encounter';

export interface RevealAsset {
  id: string;
  kind: AssetKind;
  title: string;
  /** Portrait / battle map / splash art. Optional for text-only encounters. */
  imageUrl?: string;
  /** e.g. "CR 5 · Hostile", "Tavern keeper", "Ancient ruin". */
  subtitle?: string;
  /** Stat block, read-aloud text, tactics — anything text-heavy. */
  body?: string;
  tags?: string[];
}

export interface Combatant {
  id: string;
  name: string;
  init: number;
  hp: number;
  maxHp: number;
  isEnemy?: boolean;
}

export interface SessionTheatreProps {
  sessionTitle?: string;
  campaignName?: string;
  /** Rendered Tiptap output as an HTML string. */
  notesHtml?: string;
  /** …or pass your own rendered notes node instead of notesHtml. */
  notes?: ReactNode;
  assets?: RevealAsset[];
  /** Controlled theme. Omit to let the theatre manage its own. */
  /** Optional override. Defaults to the signed-in user's theme (users.theme). */
  theme?: string;
  onExit?: () => void;
}

/* ------------------------------------------------------------------ *
 * Dice — supports "1d20+5", "2d6", "d20-1", "1d8+1d6+2".
 * ------------------------------------------------------------------ */

interface RollResult {
  expr: string;
  total: number;
  detail: string;
}

function rollExpression(raw: string): RollResult | null {
  const cleaned = raw.replace(/\s+/g, '').toLowerCase();
  if (!cleaned) return null;

  const termRe = /([+-]?)(\d*d\d+|\d+)/g;
  // Reject anything that isn't fully made of valid terms.
  if (cleaned.replace(termRe, '') !== '') return null;

  termRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  let total = 0;
  let matched = false;
  const parts: string[] = [];

  while ((match = termRe.exec(cleaned)) !== null) {
    matched = true;
    const sign = match[1] === '-' ? -1 : 1;
    const token = match[2];

    if (token.includes('d')) {
      const [countStr, sidesStr] = token.split('d');
      const count = countStr === '' ? 1 : parseInt(countStr, 10);
      const sides = parseInt(sidesStr, 10);
      if (!sides || count < 1 || count > 100) return null;

      const rolls: number[] = [];
      for (let i = 0; i < count; i += 1) {
        rolls.push(1 + Math.floor(Math.random() * sides));
      }
      const sub = rolls.reduce((a, b) => a + b, 0) * sign;
      total += sub;
      parts.push(`${sign < 0 ? '−' : ''}${count}d${sides}[${rolls.join(', ')}]`);
    } else {
      const val = parseInt(token, 10);
      total += val * sign;
      parts.push(`${sign < 0 ? '−' : '+'}${val}`);
    }
  }

  if (!matched) return null;
  return { expr: cleaned, total, detail: parts.join(' ') };
}

const KIND_LABEL: Record<AssetKind, string> = {
  art: 'Art', map: 'Maps', npc: 'NPCs', encounter: 'Encounters',
};
const KIND_ORDER: AssetKind[] = ['art', 'map', 'npc', 'encounter'];

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

type DmPanel = null | 'dice' | 'initiative' | 'scratch';

let idSeed = 0;
const nextId = () => `c${(idSeed += 1)}`;

export default function SessionTheatre({
  sessionTitle = 'Untitled session',
  campaignName,
  notesHtml,
  notes,
  assets = [],
  theme,
  onExit,
}: SessionTheatreProps) {
  // Theme comes from the signed-in user (users.theme). The optional `theme`
  // prop overrides it if you ever need to; otherwise it's fully automatic.
  const { user } = useAuth();
  const activeTheme = coerceTheme(theme ?? user?.theme);

  // Resizable panes. Stage flexes to fill whatever the rails don't take.
  const [notesW, setNotesW] = useState(PANE_DEFAULT);
  const [trayW, setTrayW] = useState(PANE_DEFAULT);
  const dragRef = useRef<{ kind: 'notes' | 'tray'; startX: number; startW: number } | null>(null);

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = e.clientX - d.startX;
    const next = clamp(d.kind === 'notes' ? d.startW + delta : d.startW - delta, PANE_MIN, PANE_MAX);
    if (d.kind === 'notes') setNotesW(next); else setTrayW(next);
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', endDrag);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, [onDragMove]);

  const startResize = useCallback(
    (kind: 'notes' | 'tray') => (e: ReactPointerEvent) => {
      e.preventDefault();
      dragRef.current = { kind, startX: e.clientX, startW: kind === 'notes' ? notesW : trayW };
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', endDrag);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [notesW, trayW, onDragMove, endDrag],
  );

  const onHandleKey = useCallback((kind: 'notes' | 'tray', e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16;
    const grow = kind === 'notes' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = kind === 'notes' ? 'ArrowLeft' : 'ArrowRight';
    const set = kind === 'notes' ? setNotesW : setTrayW;
    if (e.key === grow) { e.preventDefault(); set((w) => clamp(w + step, PANE_MIN, PANE_MAX)); }
    else if (e.key === shrink) { e.preventDefault(); set((w) => clamp(w - step, PANE_MIN, PANE_MAX)); }
  }, []);

  const rootStyle = {
    '--notes-w': `${notesW}px`,
    '--tray-w': `${trayW}px`,
  } as unknown as CSSProperties;

  const [stage, setStage] = useState<RevealAsset | null>(null);
  const [tab, setTab] = useState<AssetKind>('art');
  const [notesOpen, setNotesOpen] = useState(true);
  const [trayOpen, setTrayOpen] = useState(true);
  const [panel, setPanel] = useState<DmPanel>(null);

  // Dice
  const [diceInput, setDiceInput] = useState('1d20');
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const [diceError, setDiceError] = useState(false);

  // Initiative
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [turn, setTurn] = useState(0);
  const [cName, setCName] = useState('');
  const [cInit, setCInit] = useState('');
  const [cHp, setCHp] = useState('');
  const [cEnemy, setCEnemy] = useState(true);

  // Scratch
  const [scratch, setScratch] = useState('');

  const dmgRefs = useRef<Record<string, string>>({});

  const reveal = useCallback((asset: RevealAsset) => setStage(asset), []);
  const clearStage = useCallback(() => setStage(null), []);

  const trayItems = useMemo(
    () => assets.filter((a) => a.kind === tab),
    [assets, tab],
  );

  const kindCounts = useMemo(() => {
    const counts: Record<AssetKind, number> = { art: 0, map: 0, npc: 0, encounter: 0 };
    assets.forEach((a) => { counts[a.kind] += 1; });
    return counts;
  }, [assets]);

  /* --- dice handlers --- */
  const doRoll = useCallback(() => {
    const result = rollExpression(diceInput);
    if (!result) { setDiceError(true); return; }
    setDiceError(false);
    setRolls((prev) => [result, ...prev].slice(0, 8));
  }, [diceInput]);

  const quickRoll = useCallback((expr: string) => {
    const result = rollExpression(expr);
    if (result) setRolls((prev) => [result, ...prev].slice(0, 8));
  }, []);

  /* --- initiative handlers --- */
  const addCombatant = useCallback(() => {
    const name = cName.trim();
    const init = parseInt(cInit, 10);
    if (!name || Number.isNaN(init)) return;
    const hp = parseInt(cHp, 10);
    const safeHp = Number.isNaN(hp) ? 0 : hp;
    setCombatants((prev) =>
      [...prev, { id: nextId(), name, init, hp: safeHp, maxHp: safeHp, isEnemy: cEnemy }]
        .sort((a, b) => b.init - a.init));
    setCName(''); setCInit(''); setCHp('');
  }, [cName, cInit, cHp, cEnemy]);

  const removeCombatant = useCallback((id: string) => {
    setCombatants((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setTurn((t) => (next.length ? Math.min(t, next.length - 1) : 0));
      return next;
    });
  }, []);

  const applyHp = useCallback((id: string, delta: number) => {
    setCombatants((prev) => prev.map((c) =>
      c.id === id ? { ...c, hp: Math.max(0, Math.min(c.maxHp || Infinity, c.hp + delta)) } : c));
  }, []);

  const nextTurn = useCallback(() => {
    setTurn((t) => (combatants.length ? (t + 1) % combatants.length : 0));
  }, [combatants.length]);

  const resetCombat = useCallback(() => { setCombatants([]); setTurn(0); }, []);

  const togglePanel = (p: DmPanel) => setPanel((cur) => (cur === p ? null : p));

  let notesBody: ReactNode;
  if (notes) {
    notesBody = notes;
  } else if (notesHtml) {
    notesBody = (
      <div
        className="theatre__notes-html"
        // Tiptap already produces sanitized HTML in your editor.
        dangerouslySetInnerHTML={{ __html: notesHtml }}
      />
    );
  } else {
    notesBody = (
      <div className="theatre__notes-empty">
        <p className="theatre__notes-empty-title">No notes loaded</p>
        <p className="theatre__notes-empty-hint">Your session notes will appear here.</p>
      </div>
    );
  }

  return (
    <div className={`theatre theatre--${activeTheme}`} style={rootStyle} role="application" aria-label="Session theatre">
      {/* Curtain / header */}
      <header className="theatre__curtain">
        <div className="theatre__curtain-left">
          {onExit && (
            <button type="button" className="theatre__icon-btn" onClick={onExit} aria-label="Exit theatre">
              ‹ Exit
            </button>
          )}
          <button
            type="button"
            className={`theatre__icon-btn ${notesOpen ? 'is-on' : ''}`}
            onClick={() => setNotesOpen((v) => !v)}
            aria-pressed={notesOpen}
          >
            Notes
          </button>
        </div>

        <div className="theatre__title">
          <span className="theatre__title-main">{sessionTitle}</span>
          {campaignName && <span className="theatre__title-sub">{campaignName}</span>}
        </div>

        <div className="theatre__curtain-right">
          <button
            type="button"
            className={`theatre__icon-btn ${trayOpen ? 'is-on' : ''}`}
            onClick={() => setTrayOpen((v) => !v)}
            aria-pressed={trayOpen}
          >
            Tray
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="theatre__body">
        {notesOpen && (
          <aside className="theatre__notes" aria-label="Session notes">
            {notesBody}
          </aside>
        )}
        {notesOpen && (
          <div
            className="theatre__handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize notes panel"
            tabIndex={0}
            onPointerDown={startResize('notes')}
            onKeyDown={(e) => onHandleKey('notes', e)}
            onDoubleClick={() => setNotesW(PANE_DEFAULT)}
          />
        )}

        <main className="theatre__stage" aria-label="Stage">
          {stage ? (
            <div className="theatre__scene" key={stage.id}>
              <div className="theatre__scene-head">
                <div>
                  <h2 className="theatre__scene-title">{stage.title}</h2>
                  {stage.subtitle && <p className="theatre__scene-sub">{stage.subtitle}</p>}
                </div>
                <button type="button" className="theatre__icon-btn" onClick={clearStage}>
                  Clear stage
                </button>
              </div>

              {stage.imageUrl && (
                <div className="theatre__scene-media">
                  <img src={stage.imageUrl} alt={stage.title} />
                </div>
              )}

              {stage.body && <pre className="theatre__scene-body">{stage.body}</pre>}

              {stage.tags && stage.tags.length > 0 && (
                <div className="theatre__tags">
                  {stage.tags.map((tg) => <span key={tg} className="theatre__tag">{tg}</span>)}
                </div>
              )}
            </div>
          ) : (
            <div className="theatre__empty">
              <p className="theatre__empty-mark">✦</p>
              <p className="theatre__empty-text">The stage is dark.</p>
              <p className="theatre__empty-hint">Pick something from the tray to reveal it.</p>
            </div>
          )}
        </main>

        {trayOpen && (
          <div
            className="theatre__handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize tray panel"
            tabIndex={0}
            onPointerDown={startResize('tray')}
            onKeyDown={(e) => onHandleKey('tray', e)}
            onDoubleClick={() => setTrayW(PANE_DEFAULT)}
          />
        )}
        {trayOpen && (
          <aside className="theatre__tray" aria-label="Reveal tray">
            <div className="theatre__tabs" role="tablist">
              {KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  className={`theatre__tab ${tab === k ? 'is-active' : ''}`}
                  onClick={() => setTab(k)}
                >
                  {KIND_LABEL[k]}
                  <span className="theatre__tab-count">{kindCounts[k]}</span>
                </button>
              ))}
            </div>

            <div className="theatre__tray-grid">
              {trayItems.length === 0 && (
                <p className="theatre__tray-empty">Nothing here yet.</p>
              )}
              {trayItems.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className={`theatre__card ${stage?.id === asset.id ? 'is-live' : ''}`}
                  onClick={() => reveal(asset)}
                >
                  {asset.imageUrl ? (
                    <span
                      className="theatre__card-thumb"
                      style={{ backgroundImage: `url(${asset.imageUrl})` }}
                    />
                  ) : (
                    <span className="theatre__card-thumb theatre__card-thumb--text">{KIND_LABEL[asset.kind][0]}</span>
                  )}
                  <span className="theatre__card-meta">
                    <span className="theatre__card-title">{asset.title}</span>
                    {asset.subtitle && <span className="theatre__card-sub">{asset.subtitle}</span>}
                  </span>
                  {stage?.id === asset.id && <span className="theatre__live-badge">On stage</span>}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* DM tools panel */}
      {panel && (
        <div className="theatre__panel" role="region" aria-label={`${panel} tools`}>
          {panel === 'dice' && (
            <div className="theatre__dice">
              <div className="theatre__dice-controls">
                <input
                  className={`theatre__input ${diceError ? 'is-error' : ''}`}
                  value={diceInput}
                  onChange={(e) => { setDiceInput(e.target.value); setDiceError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && doRoll()}
                  placeholder="1d20+5"
                  aria-label="Dice expression"
                />
                <button type="button" className="theatre__btn" onClick={doRoll}>Roll</button>
                <div className="theatre__quick">
                  {['d20', 'd12', 'd8', 'd6', 'd4', '2d6'].map((d) => (
                    <button key={d} type="button" className="theatre__chip" onClick={() => quickRoll(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <ul className="theatre__roll-log">
                {rolls.length === 0 && <li className="theatre__roll-empty">No rolls yet.</li>}
                {rolls.map((r, i) => (
                  <li key={`${r.expr}-${i}`} className={`theatre__roll ${i === 0 ? 'is-latest' : ''}`}>
                    <span className="theatre__roll-total">{r.total}</span>
                    <span className="theatre__roll-detail">{r.expr} → {r.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {panel === 'initiative' && (
            <div className="theatre__init">
              <div className="theatre__init-add">
                <input className="theatre__input" placeholder="Name" value={cName}
                  onChange={(e) => setCName(e.target.value)} aria-label="Combatant name" />
                <input className="theatre__input theatre__input--num" placeholder="Init" value={cInit}
                  onChange={(e) => setCInit(e.target.value)} aria-label="Initiative" />
                <input className="theatre__input theatre__input--num" placeholder="HP" value={cHp}
                  onChange={(e) => setCHp(e.target.value)} aria-label="Hit points" />
                <button
                  type="button"
                  className={`theatre__chip ${cEnemy ? 'is-enemy' : ''}`}
                  onClick={() => setCEnemy((v) => !v)}
                  aria-pressed={cEnemy}
                >
                  {cEnemy ? 'Enemy' : 'Ally'}
                </button>
                <button type="button" className="theatre__btn" onClick={addCombatant}>Add</button>
                {combatants.length > 0 && (
                  <>
                    <button type="button" className="theatre__btn theatre__btn--ghost" onClick={nextTurn}>Next turn ›</button>
                    <button type="button" className="theatre__icon-btn" onClick={resetCombat}>Clear</button>
                  </>
                )}
              </div>

              <ul className="theatre__init-list">
                {combatants.length === 0 && <li className="theatre__roll-empty">Add combatants to start tracking.</li>}
                {combatants.map((c, i) => (
                  <li key={c.id} className={`theatre__combatant ${i === turn ? 'is-turn' : ''} ${c.isEnemy ? 'is-enemy' : ''} ${c.hp === 0 && c.maxHp > 0 ? 'is-down' : ''}`}>
                    <span className="theatre__init-badge">{c.init}</span>
                    <span className="theatre__combatant-name">{c.name}</span>
                    {c.maxHp > 0 && (
                      <span className="theatre__hp">
                        <span className="theatre__hp-track">
                          <span
                            className="theatre__hp-fill"
                            style={{ width: `${Math.round((c.hp / c.maxHp) * 100)}%` }}
                          />
                        </span>
                        <span className="theatre__hp-num">{c.hp}/{c.maxHp}</span>
                      </span>
                    )}
                    <span className="theatre__combatant-actions">
                      <input
                        className="theatre__input theatre__input--tiny"
                        placeholder="±"
                        defaultValue=""
                        onChange={(e) => { dmgRefs.current[c.id] = e.target.value; }}
                        aria-label={`Adjust HP for ${c.name}`}
                      />
                      <button type="button" className="theatre__mini theatre__mini--dmg"
                        onClick={() => applyHp(c.id, -Math.abs(parseInt(dmgRefs.current[c.id] || '0', 10) || 0))}>
                        Damage
                      </button>
                      <button type="button" className="theatre__mini theatre__mini--heal"
                        onClick={() => applyHp(c.id, Math.abs(parseInt(dmgRefs.current[c.id] || '0', 10) || 0))}>
                        Heal
                      </button>
                      <button type="button" className="theatre__mini" onClick={() => removeCombatant(c.id)} aria-label={`Remove ${c.name}`}>✕</button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {panel === 'scratch' && (
            <textarea
              className="theatre__scratch"
              value={scratch}
              onChange={(e) => setScratch(e.target.value)}
              placeholder="Names improvised on the fly, promises made, loose threads to follow up…"
              aria-label="Scratch notes"
            />
          )}
        </div>
      )}

      {/* DM bar */}
      <footer className="theatre__bar">
        <button type="button" className={`theatre__tool ${panel === 'dice' ? 'is-open' : ''}`} onClick={() => togglePanel('dice')}>
          ⬦ Dice
        </button>
        <button type="button" className={`theatre__tool ${panel === 'initiative' ? 'is-open' : ''}`} onClick={() => togglePanel('initiative')}>
          ⚔ Initiative{combatants.length > 0 ? ` · ${combatants.length}` : ''}
        </button>
        <button type="button" className={`theatre__tool ${panel === 'scratch' ? 'is-open' : ''}`} onClick={() => togglePanel('scratch')}>
          ✎ Scratch
        </button>
      </footer>
    </div>
  );
}