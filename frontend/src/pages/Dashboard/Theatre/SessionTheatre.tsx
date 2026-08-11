import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getCampaigns, createCampaign } from '../../../api/backendHelpers'; // ← adjust to your helpers' path
import '../../../styles/SessionTheatre.css';
import '../../../styles/theatreGate.css';

import type {
  AssetKind,
  Campaign,
  Combatant,
  DmPanel,
  RevealAsset,
  RollResult,
  SessionTheatreProps,
} from './Components/types';
import { PANE_DEFAULT, PANE_MAX, PANE_MIN, clamp, coerceTheme } from './Components/types';
import { rollExpression } from './Components/dice';
import CampaignGate from './Components/CampaignGate';
import Curtain from './Components/Curtain';
import ResizeHandle from './Components/ResizeHandle';
import Stage from './Components/Stage';
import Tray from './Components/Tray';
import DmBar from './Components/DmBar';
import DicePanel from './Components/DicePanel';
import InitiativePanel from './Components/InitiativePanel';
import ScratchPanel from './Components/ScratchPanel';

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
  // Pass `activeCampaign` to skip the gate and go straight to the stage.
  // Otherwise the theatre fetches campaigns itself and gates on entry.
  activeCampaign = null,
  onCampaignSelected,
}: SessionTheatreProps) {
  // Theme comes from the signed-in user (users.theme). The optional `theme`
  // prop overrides it if you ever need to; otherwise it's fully automatic.
  const { user } = useAuth();
  const activeTheme = coerceTheme(theme ?? user?.theme);

  // Which campaign we're running. Null → show the gate before the theatre.
  const [selected, setSelected] = useState<Campaign | null>(activeCampaign);

  // Campaign list for the gate — fetched on mount unless we already have one.
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(!activeCampaign);

  useEffect(() => {
    if (activeCampaign) return;
    let alive = true;
    getCampaigns()
      .then((res) => { if (alive) setCampaigns(res.data); })
      .catch(() => { if (alive) setCampaigns([]); })
      .finally(() => { if (alive) setCampaignsLoading(false); });
    return () => { alive = false; };
  }, [activeCampaign]);

  const handleCreateCampaign = useCallback(async (name: string): Promise<Campaign> => {
    const res = await createCampaign({ name });
    const created: Campaign = res.data;
    setCampaigns((prev) => [created, ...prev]);
    return created;
  }, []);

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

  const selectCampaign = useCallback((c: Campaign) => {
    setSelected(c);
    onCampaignSelected?.(c);
  }, [onCampaignSelected]);

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

  const togglePanel = useCallback((p: DmPanel) => setPanel((cur) => (cur === p ? null : p)), []);

  // Gate: choose or create a campaign before the stage opens.
  // Rendered after every hook above so hook order stays stable when `selected` flips.
  if (!selected) {
    return (
      <CampaignGate
        campaigns={campaigns}
        loading={campaignsLoading}
        theme={theme}
        onSelect={selectCampaign}
        onCreate={handleCreateCampaign}
        onExit={onExit}
      />
    );
  }

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
      <Curtain
        sessionTitle={sessionTitle}
        campaignName={selected.name ?? campaignName}
        notesOpen={notesOpen}
        trayOpen={trayOpen}
        onToggleNotes={() => setNotesOpen((v) => !v)}
        onToggleTray={() => setTrayOpen((v) => !v)}
        onExit={onExit}
      />

      <div className="theatre__body">
        {notesOpen && (
          <aside className="theatre__notes" aria-label="Session notes">
            {notesBody}
          </aside>
        )}
        {notesOpen && (
          <ResizeHandle
            label="Resize notes panel"
            onPointerDown={startResize('notes')}
            onKeyDown={(e) => onHandleKey('notes', e)}
            onReset={() => setNotesW(PANE_DEFAULT)}
          />
        )}

        <Stage stage={stage} onClear={clearStage} />

        {trayOpen && (
          <ResizeHandle
            label="Resize tray panel"
            onPointerDown={startResize('tray')}
            onKeyDown={(e) => onHandleKey('tray', e)}
            onReset={() => setTrayW(PANE_DEFAULT)}
          />
        )}
        {trayOpen && (
          <Tray
            tab={tab}
            onTabChange={setTab}
            items={trayItems}
            kindCounts={kindCounts}
            stageId={stage?.id}
            onReveal={reveal}
          />
        )}
      </div>

      {panel && (
        <div className="theatre__panel" role="region" aria-label={`${panel} tools`}>
          {panel === 'dice' && (
            <DicePanel
              diceInput={diceInput}
              diceError={diceError}
              rolls={rolls}
              onInputChange={(v) => { setDiceInput(v); setDiceError(false); }}
              onRoll={doRoll}
              onQuickRoll={quickRoll}
            />
          )}

          {panel === 'initiative' && (
            <InitiativePanel
              combatants={combatants}
              turn={turn}
              cName={cName}
              cInit={cInit}
              cHp={cHp}
              cEnemy={cEnemy}
              onNameChange={setCName}
              onInitChange={setCInit}
              onHpChange={setCHp}
              onToggleEnemy={() => setCEnemy((v) => !v)}
              onAdd={addCombatant}
              onRemove={removeCombatant}
              onApplyHp={applyHp}
              onNextTurn={nextTurn}
              onReset={resetCombat}
              dmgRefs={dmgRefs}
            />
          )}

          {panel === 'scratch' && (
            <ScratchPanel value={scratch} onChange={setScratch} />
          )}
        </div>
      )}

      <DmBar panel={panel} combatantCount={combatants.length} onToggle={togglePanel} />
    </div>
  );
}