import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  getCampaigns, createCampaign, getSessions, createSession, getCampaignItems, createCampaignItem, updateSession,
  getEncounters,
} from '../../../api/backendHelpers'; // ← adjust path
import '../../../styles/SessionTheatre.css';
import '../../../styles/theatreGate.css';

import type {
  AssetKind,
  Campaign,
  Combatant,
  DmPanel,
  InitiativeState,
  NewItemInput,
  RevealAsset,
  RollResult,
  Session,
  SessionTheatreProps,
  StagedAsset,
  TheatreEncounter,
} from './Components/types';
import { PANE_DEFAULT, PANE_MAX, PANE_MIN, clamp, coerceTheme } from './Components/types';
import { rollExpression } from './Components/dice';
import { useTable } from './Components/useTable';
import CampaignGate from './Components/CampaignGate';
import SessionPicker from './Components/SessionPicker';
import Curtain from './Components/Curtain';
import ResizeHandle from './Components/ResizeHandle';
import Stage from './Components/Stage';
import Tray from './Components/Tray';
import TheatreSideNav from './Components/TheatreSideNav';
import DicePanel from './Components/DicePanel';
import InitiativePanel from './Components/InitiativePanel';
import ScratchPanel from './Components/ScratchPanel';
import EncounterTakeover from './Components/EncounterTakeover';
import TheatreNotesEditor from './Components/TheatreNotesEditor';
import MonsterDetailSlideOver from '../Monsters/Components/MonsterDetailSlideOver';

let idSeed = 0;
const nextId = () => `c${(idSeed += 1)}`;

// Maps raw sessions JSON → Session. One place to edit if the serializer changes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSession(raw: any): Session {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaign_id ?? ''),
    title: raw.title ?? 'Untitled session',
    notes: raw.notes ?? undefined,
    sessionNumber: raw.session_number ?? undefined,
    playedOn: raw.played_on ?? undefined,
    updatedAt: raw.updated_at ?? undefined,
  };
}

// Maps raw item JSON (campaign-scoped loot/gear) → a draggable RevealAsset.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(raw: any): RevealAsset {
  const categories: string[] | undefined = Array.isArray(raw.categories) && raw.categories.length
    ? raw.categories
    : undefined;
  return {
    id: String(raw.id),
    kind: (raw.kind as AssetKind) ?? 'item',
    title: raw.name ?? 'Unnamed item',
    imageUrl: raw.image_url ?? undefined,
    subtitle: categories?.join(', '),
    body: raw.notes ?? undefined,
    tags: categories,
  };
}

// Maps raw encounter JSON (with nested phases/monsters) → a TheatreEncounter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEncounter(raw: any): TheatreEncounter {
  return {
    id: String(raw.id),
    name: raw.name ?? 'Untitled encounter',
    notes: raw.notes ?? undefined,
    campaignId: raw.campaign_id ? String(raw.campaign_id) : null,
    sessionId: raw.session_id ? String(raw.session_id) : null,
    phases: [...(raw.encounter_phases ?? [])]
      .sort((a, b) => a.position - b.position)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: String(p.id),
        name: p.name ?? 'Phase',
        position: p.position ?? 0,
        notes: p.notes ?? undefined,
        monsters: (p.encounter_monsters ?? []).map((m: any) => ({
          id: String(m.id),
          name: m.name,
          challengeRating: m.challenge_rating ?? null,
          maxHp: m.max_hp ?? null,
          armorClass: m.armor_class ?? null,
          quantity: m.quantity ?? 1,
          monsterId: m.monster_id ? String(m.monster_id) : null,
        })),
      })),
  };
}

export default function SessionTheatre({
  sessionTitle = 'Untitled session',
  campaignName,
  notes,
  assets = [],
  theme,
  onExit,
  activeCampaign = null,
  onCampaignSelected,
}: SessionTheatreProps) {
  const { user, token } = useAuth();
  const activeTheme = coerceTheme(theme ?? user?.theme);

  // Which campaign we're running. Null → show the campaign gate.
  const [selected, setSelected] = useState<Campaign | null>(activeCampaign);

  // Campaign list for the gate.
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(!activeCampaign);

  // Sessions for the selected campaign (owner path only).
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  // Items the DM has placed in this campaign — draggable onto the stage.
  const [campaignItems, setCampaignItems] = useState<RevealAsset[]>([]);

  useEffect(() => {
    if (!selected || selected.role === 'player') return;
    let alive = true;
    getCampaignItems(selected.id)
      .then((res) => { if (alive) setCampaignItems(res.data.map(normalizeItem)); })
      .catch(() => { if (alive) setCampaignItems([]); });
    return () => { alive = false; };
  }, [selected]);

  // Encounters buildable for this campaign — revealable once a session is active.
  const [campaignEncounters, setCampaignEncounters] = useState<TheatreEncounter[]>([]);

  useEffect(() => {
    if (!selected || selected.role === 'player') { setCampaignEncounters([]); return; }
    let alive = true;
    getEncounters({ campaignId: selected.id })
      .then((res) => { if (alive) setCampaignEncounters(res.data.map(normalizeEncounter)); })
      .catch(() => { if (alive) setCampaignEncounters([]); });
    return () => { alive = false; };
  }, [selected]);

  // Encounters relevant to this specific session: tied to it directly, or
  // not yet tied to any session at all (so nothing gets hidden just because
  // the DM hasn't linked it up front).
  const sessionEncounters = useMemo(
    () => campaignEncounters.filter((e) => !e.sessionId || e.sessionId === activeSession?.id),
    [campaignEncounters, activeSession]
  );

  useEffect(() => {
    if (activeCampaign) return;
    let alive = true;
    getCampaigns()
      .then((res) => { if (alive) setCampaigns(res.data); })
      .catch(() => { if (alive) setCampaigns([]); })
      .finally(() => { if (alive) setCampaignsLoading(false); });
    return () => { alive = false; };
  }, [activeCampaign]);

  // Fetch this campaign's sessions once a campaign is chosen (owners only).
  useEffect(() => {
    if (!selected || selected.role === 'player') return;
    let alive = true;
    setSessionsLoading(true);
    setActiveSession(null);
    getSessions(selected.id)
      .then((res) => { if (alive) setSessions(res.data.map(normalizeSession)); })
      .catch(() => { if (alive) setSessions([]); })
      .finally(() => { if (alive) setSessionsLoading(false); });
    return () => { alive = false; };
  }, [selected]);

  const handleCreateCampaign = useCallback(async (name: string): Promise<Campaign> => {
    const res = await createCampaign({ name });
    const created: Campaign = res.data;
    setCampaigns((prev) => [created, ...prev]);
    return created;
  }, []);

  const handleCreateSession = useCallback(async (title: string): Promise<Session> => {
    if (!selected) throw new Error('No campaign selected.');
    const res = await createSession({ title, campaign_id: selected.id });
    const created = normalizeSession(res.data);
    setSessions((prev) => [created, ...prev]);
    return created;
  }, [selected]);

  const handleCreateItem = useCallback(async (data: NewItemInput): Promise<RevealAsset> => {
    if (!selected) throw new Error('No campaign selected.');
    const { imageUrl, ...rest } = data;
    const res = await createCampaignItem(selected.id, { ...rest, image_url: imageUrl });
    const created = normalizeItem(res.data);
    setCampaignItems((prev) => [...prev, created]);
    return created;
  }, [selected]);

  // Resizable panes. Initiative and Notes sit on the left of the stage (grow
  // when dragged right); the Tray sits on the right (grows when dragged left).
  type PaneKind = 'initiative' | 'notes' | 'tray';
  const [initiativeW, setInitiativeW] = useState(PANE_DEFAULT);
  const [notesW, setNotesW] = useState(PANE_DEFAULT);
  const [trayW, setTrayW] = useState(PANE_DEFAULT);
  const dragRef = useRef<{ kind: PaneKind; startX: number; startW: number } | null>(null);

  const widthFor = useCallback((kind: PaneKind) => {
    if (kind === 'initiative') return initiativeW;
    if (kind === 'notes') return notesW;
    return trayW;
  }, [initiativeW, notesW, trayW]);

  const setWidthFor = useCallback((kind: PaneKind, next: number) => {
    if (kind === 'initiative') setInitiativeW(next);
    else if (kind === 'notes') setNotesW(next);
    else setTrayW(next);
  }, []);

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = e.clientX - d.startX;
    const grows = d.kind !== 'tray';
    const next = clamp(grows ? d.startW + delta : d.startW - delta, PANE_MIN, PANE_MAX);
    setWidthFor(d.kind, next);
  }, [setWidthFor]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', endDrag);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, [onDragMove]);

  const startResize = useCallback(
    (kind: PaneKind) => (e: ReactPointerEvent) => {
      e.preventDefault();
      dragRef.current = { kind, startX: e.clientX, startW: widthFor(kind) };
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', endDrag);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [widthFor, onDragMove, endDrag],
  );

  const onHandleKey = useCallback((kind: PaneKind, e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16;
    const grows = kind !== 'tray';
    const grow = grows ? 'ArrowRight' : 'ArrowLeft';
    const shrink = grows ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === grow) { e.preventDefault(); setWidthFor(kind, clamp(widthFor(kind) + step, PANE_MIN, PANE_MAX)); }
    else if (e.key === shrink) { e.preventDefault(); setWidthFor(kind, clamp(widthFor(kind) - step, PANE_MIN, PANE_MAX)); }
  }, [widthFor, setWidthFor]);

  const rootStyle = {
    '--initiative-w': `${initiativeW}px`,
    '--notes-w': `${notesW}px`,
    '--tray-w': `${trayW}px`,
  } as unknown as CSSProperties;

  // Stage is shared over ActionCable: the DM drives it, players receive it live.
  const { stage, addToStage, removeFromStage, moveAsset, clearStage } = useTable({
    campaignId: selected?.id ?? null,
    role: selected?.role,
    token,
  });
  const stagedIds = useMemo(() => new Set(stage.map((s) => s.id)), [stage]);

  // A revealed encounter takes over the whole theatre (sidenav aside) until
  // minimized or ended. Minimizing is purely local — it doesn't touch the
  // shared stage, so players keep seeing the reveal either way.
  const encounterAsset = useMemo(() => stage.find((a) => a.kind === 'encounter'), [stage]);
  const [encounterMinimized, setEncounterMinimized] = useState(false);
  useEffect(() => {
    setEncounterMinimized(false);
  }, [encounterAsset?.instanceId]);

  const [viewMonsterId, setViewMonsterId] = useState<string | null>(null);

  const [tab, setTab] = useState<AssetKind>('art');
  const [notesOpen, setNotesOpen] = useState(true);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
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
  const [cAc, setCAc] = useState('');
  const [cEnemy, setCEnemy] = useState(true);

  // Scratch
  const [scratch, setScratch] = useState('');

  const dmgRefs = useRef<Record<string, string>>({});

  const selectCampaign = useCallback((c: Campaign) => {
    setSelected(c);
    onCampaignSelected?.(c);
  }, [onCampaignSelected]);

  // Each phase of a session-relevant encounter becomes a revealable tray
  // card — dragging/revealing it works exactly like any other asset, since
  // the Stage and Tray don't know or care that it's an encounter under the
  // hood. `combatants` rides along so the Stage takeover can roll initiative
  // without looking anything up.
  const encounterAssets = useMemo<RevealAsset[]>(
    () =>
      sessionEncounters.flatMap((enc) =>
        enc.phases.map((phase) => ({
          id: `${enc.id}::${phase.id}`,
          kind: 'encounter' as const,
          title: enc.phases.length > 1 ? `${enc.name} — ${phase.name}` : enc.name,
          subtitle: phase.notes,
          tags: phase.monsters.map((m) => (m.quantity > 1 ? `${m.name} ×${m.quantity}` : m.name)),
          combatants: phase.monsters.map((m) => ({
            name: m.name, quantity: m.quantity, maxHp: m.maxHp, armorClass: m.armorClass, monsterId: m.monsterId,
          })),
        }))
      ),
    [sessionEncounters]
  );

  const allAssets = useMemo(
    () => [...assets, ...campaignItems.filter((i) => i.kind !== 'encounter'), ...encounterAssets],
    [assets, campaignItems, encounterAssets]
  );

  const trayItems = useMemo(
    () => allAssets.filter((a) => a.kind === tab),
    [allAssets, tab],
  );

  const kindCounts = useMemo(() => {
    const counts: Record<AssetKind, number> = { art: 0, map: 0, npc: 0, encounter: 0, item: 0 };
    allAssets.forEach((a) => { counts[a.kind] += 1; });
    return counts;
  }, [allAssets]);

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

  /* --- initiative handlers ---
   * Order is manual/drag-driven, not auto-sorted by init: adding or editing
   * a value only updates that row, so it never undoes how the DM arranged
   * the list. */
  // Init is optional: a last-minute addition (a walk-on NPC, a monster that
  // shows up mid-fight) can be dropped in with just a name — its initiative
  // gets auto-rolled — or the DM can type a known value to override that.
  const addCombatant = useCallback(() => {
    const name = cName.trim();
    if (!name) return;
    const typedInit = parseInt(cInit, 10);
    const init = Number.isNaN(typedInit) ? rollExpression('1d20')?.total ?? 10 : typedInit;
    const hp = parseInt(cHp, 10);
    const safeHp = Number.isNaN(hp) ? 0 : hp;
    const ac = parseInt(cAc, 10);
    const safeAc = Number.isNaN(ac) ? null : ac;
    setCombatants((prev) => [
      ...prev,
      { id: nextId(), name, init, hp: safeHp, maxHp: safeHp, armorClass: safeAc, isEnemy: cEnemy },
    ]);
    setCName(''); setCInit(''); setCHp(''); setCAc('');
  }, [cName, cInit, cHp, cAc, cEnemy]);

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

  // Drops a revealed encounter's monsters into the tracker — one entry per
  // creature (a quantity of 3 becomes "Goblin 1/2/3"), each with a rolled
  // initiative and its snapshotted HP, if any.
  const handleRollInitiative = useCallback((asset: StagedAsset) => {
    const added: Combatant[] = (asset.combatants ?? []).flatMap((m) => {
      const hp = m.maxHp ?? 0;
      return Array.from({ length: Math.max(1, m.quantity) }, (_, i) => ({
        id: nextId(),
        name: m.quantity > 1 ? `${m.name} ${i + 1}` : m.name,
        init: rollExpression('1d20')?.total ?? 10,
        hp,
        maxHp: hp,
        armorClass: m.armorClass,
        isEnemy: true,
        monsterId: m.monsterId,
      }));
    });
    if (added.length === 0) return;
    // Sort the fresh batch among itself for a sensible starting order, then
    // append — existing combatants (PCs the DM already added) keep whatever
    // order they're already in.
    added.sort((a, b) => b.init - a.init);
    setCombatants((prev) => [...prev, ...added]);
  }, []);

  // Lets the DM correct a rolled (or manually entered) initiative later —
  // ties, house rules, a misread die, whatever — without reshuffling the
  // manually-arranged order.
  const handleEditInit = useCallback((id: string, init: number) => {
    setCombatants((prev) => prev.map((c) => (c.id === id ? { ...c, init } : c)));
  }, []);

  // Drag-and-drop reordering: the array order *is* the turn order.
  const handleReorderCombatants = useCallback((draggedId: string, targetId: string) => {
    setCombatants((prev) => {
      const fromIdx = prev.findIndex((c) => c.id === draggedId);
      const toIdx = prev.findIndex((c) => c.id === targetId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // Fills in AC/HP for a combatant whose encounter snapshot didn't have them
  // (older encounters, built before AC/HP were captured) — never overwrites
  // a value that's already set.
  const handleInheritStats = useCallback((id: string, stats: { armorClass: number | null; maxHp: number }) => {
    setCombatants((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const armorClass = c.armorClass ?? stats.armorClass;
      if (c.maxHp > 0 || stats.maxHp <= 0) return { ...c, armorClass };
      return { ...c, armorClass, maxHp: stats.maxHp, hp: stats.maxHp };
    }));
  }, []);

  // Bundled so the tracker can be rendered either from the sidenav flyout or
  // embedded full-height in the encounter takeover without re-threading a
  // dozen props in two places.
  const initiativeState: InitiativeState = {
    combatants,
    turn,
    cName,
    cInit,
    cHp,
    cAc,
    cEnemy,
    onNameChange: setCName,
    onInitChange: setCInit,
    onHpChange: setCHp,
    onAcChange: setCAc,
    onToggleEnemy: () => setCEnemy((v) => !v),
    onAdd: addCombatant,
    onRemove: removeCombatant,
    onApplyHp: applyHp,
    onEditInit: handleEditInit,
    onReorder: handleReorderCombatants,
    onInheritStats: handleInheritStats,
    onViewMonster: setViewMonsterId,
    onNextTurn: nextTurn,
    onReset: resetCombat,
    dmgRefs,
  };

  const togglePanel = useCallback((p: DmPanel) => setPanel((cur) => (cur === p ? null : p)), []);

  // Picking a category from the sidenav both selects it and makes sure the tray is visible.
  const selectTrayTab = useCallback((k: AssetKind) => {
    setTab(k);
    setTrayOpen(true);
  }, []);

  // Notes shown come from the active session, unless a `notes` node was passed.
  const effectiveNotes = activeSession?.notes ?? undefined;

  // Live notes editing: debounced autosave to the session, keyed off a ref so the
  // timer always saves the latest content even if it fires after a later keystroke.
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotes = useCallback(async () => {
    const current = activeSessionRef.current;
    if (!current) return;
    try {
      await updateSession(current.id, { notes: current.notes ?? '' });
      setNotesSaveStatus('saved');
    } catch {
      setNotesSaveStatus('idle');
    }
  }, []);

  const handleNotesChange = useCallback((html: string) => {
    setActiveSession((prev) => (prev ? { ...prev, notes: html } : prev));
    setNotesSaveStatus('saving');
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    notesSaveTimer.current = setTimeout(saveNotes, 600);
  }, [saveNotes]);

  useEffect(() => () => {
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
  }, []);

  // Clear any stale "Saved" indicator when switching to a different session.
  useEffect(() => {
    setNotesSaveStatus('idle');
  }, [activeSession?.id]);

  // --- gates (all after the hooks above, so hook order stays stable) ---

  // 1) Choose / create a campaign.
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

  // 2) Player guard — read-only stage, no notes/tray/tools.
  if (selected.role === 'player') {
    return (
      <div
        className={`theatre theatre--${activeTheme} theatre--player`}
        style={rootStyle}
        role="application"
        aria-label="Session stage"
      >
        <header className="theatre__curtain">
          <div className="theatre__curtain-left">
            {onExit && (
              <button type="button" className="theatre__icon-btn" onClick={onExit} aria-label="Exit theatre">
                ‹ Exit
              </button>
            )}
          </div>
          <div className="theatre__title">
            <span className="theatre__title-main">{sessionTitle}</span>
            {(selected.name ?? campaignName) && (
              <span className="theatre__title-sub">{selected.name ?? campaignName}</span>
            )}
          </div>
          <div className="theatre__curtain-right" />
        </header>

        <div className="theatre__body">
          {encounterAsset ? (
            <EncounterTakeover asset={encounterAsset} readOnly />
          ) : (
            <Stage stage={stage} onClear={clearStage} readOnly />
          )}
        </div>
      </div>
    );
  }

  // 3) Choose / create a session for this campaign (owner path).
  if (!activeSession) {
    return (
      <SessionPicker
        campaignName={selected.name ?? campaignName ?? 'this campaign'}
        sessions={sessions}
        loading={sessionsLoading}
        theme={theme}
        onSelect={setActiveSession}
        onCreate={handleCreateSession}
        onBack={() => setSelected(null)}
        onExit={onExit}
      />
    );
  }

  // 4) Full owner theatre.
  const notesSaveLabel =
    notesSaveStatus === 'saving' ? 'Saving…' : notesSaveStatus === 'saved' ? 'Saved' : undefined;

  const notesBody: ReactNode = notes ?? (
    <TheatreNotesEditor
      key={activeSession.id}
      content={effectiveNotes ?? ''}
      onChange={handleNotesChange}
      saveLabel={notesSaveLabel}
      onCreateObject={handleCreateItem}
    />
  );

  return (
    <div className={`theatre theatre--${activeTheme}`} style={rootStyle} role="application" aria-label="Session theatre">
      <Curtain
        sessionTitle={activeSession.title ?? sessionTitle}
        campaignName={selected.name ?? campaignName}
      />

      <div className="theatre__body">
        <div className="theatre__sidenav-anchor">
          <TheatreSideNav
            onExit={onExit}
            notesOpen={notesOpen}
            onToggleNotes={() => setNotesOpen((v) => !v)}
            initiativeOpen={initiativeOpen}
            onToggleInitiative={() => setInitiativeOpen((v) => !v)}
            trayOpen={trayOpen}
            onToggleTray={() => setTrayOpen((v) => !v)}
            tab={tab}
            onTabChange={selectTrayTab}
            kindCounts={kindCounts}
            panel={panel}
            combatantCount={combatants.length}
            onTogglePanel={togglePanel}
          />

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

              {panel === 'scratch' && (
                <ScratchPanel value={scratch} onChange={setScratch} />
              )}
            </div>
          )}
        </div>

        {encounterAsset && !encounterMinimized ? (
          <EncounterTakeover
            asset={encounterAsset}
            onMinimize={() => setEncounterMinimized(true)}
            onEnd={() => { removeFromStage(encounterAsset.instanceId); setEncounterMinimized(false); }}
            onRollInitiative={handleRollInitiative}
            onViewMonster={setViewMonsterId}
            initiative={initiativeState}
          />
        ) : (
          <>
            {encounterAsset && encounterMinimized && (
              <button
                type="button"
                className="theatre__encounter-restore"
                onClick={() => setEncounterMinimized(false)}
              >
                ⚔ {encounterAsset.title} — restore
              </button>
            )}

            {initiativeOpen && (
              <aside className="theatre__initiative-col" aria-label="Initiative tracker">
                <InitiativePanel {...initiativeState} />
              </aside>
            )}
            {initiativeOpen && (
              <ResizeHandle
                label="Resize initiative panel"
                onPointerDown={startResize('initiative')}
                onKeyDown={(e) => onHandleKey('initiative', e)}
                onReset={() => setInitiativeW(PANE_DEFAULT)}
              />
            )}

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

            <Stage
              stage={stage}
              onClear={clearStage}
              onDropAsset={addToStage}
              onRemoveAsset={removeFromStage}
              onMoveAsset={moveAsset}
            />

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
                items={trayItems}
                stagedIds={stagedIds}
                onReveal={addToStage}
                onCreateItem={tab === 'encounter' ? undefined : handleCreateItem}
              />
            )}
          </>
        )}
      </div>

      <MonsterDetailSlideOver monsterId={viewMonsterId} onClose={() => setViewMonsterId(null)} />
    </div>
  );
}