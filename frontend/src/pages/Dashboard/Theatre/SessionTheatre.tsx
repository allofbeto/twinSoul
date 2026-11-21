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
  getEncounters, getCampaignCharacters,
} from '../../../api/backendHelpers'; // ← adjust path
import '../../../styles/SessionTheatre.css';
import '../../../styles/theatreGate.css';

import type {
  AssetKind,
  Campaign,
  Combatant,
  CombatantOption,
  DmPanel,
  CombatResources,
  MyCharacter,
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
import { useCombatantOptions } from './Components/useCombatantOptions';
import CampaignGate from './Components/CampaignGate';
import SessionPicker from './Components/SessionPicker';
import Curtain from './Components/Curtain';
import ResizeHandle from './Components/ResizeHandle';
import Stage from './Components/Stage';
import Tray from './Components/Tray';
import TheatreSideNav from './Components/TheatreSideNav';
import DicePanel from './Components/DicePanel';
import CombatView from './Components/CombatView';
import type { BlankCombatant } from './Components/CombatView';
import { resetForTurn } from './Components/combatResources';
import ScratchPanel from './Components/ScratchPanel';
import EncounterTakeover from './Components/EncounterTakeover';
import PlayerCombat from './Components/PlayerCombat';
import SessionNotebook from '../../../components/sessionNotebook/SessionNotebook';
import MonsterDetailSlideOver from '../Monsters/Components/MonsterDetailSlideOver';
import CharacterDetail from '../Characters/CharacterDetail';

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
  // The same items, as the server sent them. DM-only: stat blocks must never ride along on a revealed asset.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawItems, setRawItems] = useState<any[]>([]);

  useEffect(() => {
    if (!selected || selected.role === 'player') return;
    let alive = true;
    getCampaignItems(selected.id)
      .then((res) => { if (alive) { setCampaignItems(res.data.map(normalizeItem)); setRawItems(res.data); } })
      .catch(() => { if (alive) { setCampaignItems([]); setRawItems([]); } });
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

  // A player's own characters in this campaign — used both to offer joining
  // initiative and to know when it's actually their turn.
  const [myCharacters, setMyCharacters] = useState<MyCharacter[]>([]);
  useEffect(() => {
    if (!selected || selected.role !== 'player' || !user) { setMyCharacters([]); return; }
    let alive = true;
    getCampaignCharacters(selected.id)
      .then((res) => {
        if (!alive) return;
        setMyCharacters(res.data.filter((c: MyCharacter) => c.user_id === user.id));
      })
      .catch(() => { if (alive) setMyCharacters([]); });
    return () => { alive = false; };
  }, [selected, user]);

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
    setRawItems((prev) => [...prev, res.data]);
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
  const {
    stage, addToStage, removeFromStage, moveAsset, clearStage,
    sharedCombatants, sharedTurn, sharedRound, broadcastInitiative,
    characterAddRequest, requestAddCharacter, endTurn, turnDone, clearTurnDone,
  } = useTable({
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

  // Player's main-space tab: the table (stage/encounter) or their own sheet.
  // Whichever of their characters is acting right now — if any — gets shown
  // automatically when the turn reaches them; they can flip back to the
  // table at any time and it won't force them back until the NEXT time it
  // becomes their turn.
  const [mainTab, setMainTab] = useState<'table' | 'sheet'>('table');
  const myCharacterIds = useMemo(() => new Set(myCharacters.map((c) => c.id)), [myCharacters]);
  const activeCombatant = sharedCombatants[sharedTurn];
  const isMyTurn = !!activeCombatant?.characterId && myCharacterIds.has(activeCombatant.characterId);
  const sheetCharacterId = (isMyTurn ? activeCombatant?.characterId : null) ?? myCharacters[0]?.id ?? null;
  useEffect(() => {
    if (isMyTurn) setMainTab('sheet');
  }, [isMyTurn]);

  const [tab, setTab] = useState<AssetKind>('art');
  const [notesOpen, setNotesOpen] = useState(true);
  // Stage (theatre + notes + tray) is always there; the Combat tab appears once an initiative exists.
  const [view, setView] = useState<'stage' | 'combat'>('stage');
  const [combatOn, setCombatOn] = useState(false);
  const [round, setRound] = useState(1);
  const [trayOpen, setTrayOpen] = useState(true);
  const [panel, setPanel] = useState<DmPanel>(null);

  // Dice
  const [diceInput, setDiceInput] = useState('1d20');
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const [diceError, setDiceError] = useState(false);

  // Initiative
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [turn, setTurn] = useState(0);
  // The last removal, kept for a few seconds so it can be undone.
  const [removal, setRemoval] = useState<{ label: string; items: { c: Combatant; index: number }[] } | null>(null);
  const removalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scratch
  const [scratch, setScratch] = useState('');

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

  const rawById = useMemo(() => Object.fromEntries(rawItems.map((i) => [String(i.id), i])), [rawItems]);

  // What the DM can search for when adding to initiative.
  const { options: combatantOptions, loading: combatantOptionsLoading } = useCombatantOptions(
    selected?.id ?? null,
    !!selected && selected.role !== 'player',
    rawItems,
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
  const addBlank = useCallback((data: BlankCombatant) => {
    const name = data.name.trim();
    if (!name) return;
    const hp = data.hp != null && data.hp > 0 ? data.hp : 0;
    setCombatants((prev) => [
      ...prev,
      {
        id: nextId(), name, init: data.init ?? rollExpression('1d20')?.total ?? 10, hp, maxHp: hp,
        armorClass: data.ac ?? null, isEnemy: data.isEnemy, revealed: false, // hidden from players until the DM says so
      },
    ]);
  }, []);

  // Adds a searched beast / NPC / character. Initiative is d20 plus the
  // creature's DEX modifier when we know it; several of the same creature are
  // numbered ("Goblin 1", "Goblin 2"), carrying on from any already in play.
  const addFromOption = useCallback((option: CombatantOption, qty: number) => {
    setCombatants((prev) => {
      if (option.characterId && prev.some((c) => c.characterId === option.characterId)) return prev;
      const count = option.characterId ? 1 : Math.max(1, Math.min(20, qty));
      const dexMod = option.dexterity != null ? Math.floor((option.dexterity - 10) / 2) : 0;
      const already = prev.filter((c) => c.name === option.name || c.name.startsWith(`${option.name} `)).length;
      const numbered = count > 1 || already > 0;
      const added: Combatant[] = Array.from({ length: count }, (_, i) => ({
        id: nextId(),
        name: numbered ? `${option.name} ${already + i + 1}` : option.name,
        init: (rollExpression('1d20')?.total ?? 10) + dexMod,
        hp: option.maxHp,
        maxHp: option.maxHp,
        armorClass: option.armorClass,
        isEnemy: option.isEnemy,
        revealed: !!option.characterId, // a player's character is always visible; anything else starts hidden
        monsterId: option.monsterId ?? null,
        itemId: option.itemId ?? null,
        characterId: option.characterId ?? null,
      }));
      return [...prev, ...added];
    });
  }, []);

  // Refs so handlers always see the latest order and turn.
  const combatantsRef = useRef(combatants);
  combatantsRef.current = combatants;
  const turnRef = useRef(turn);
  turnRef.current = turn;

  const flashRemoval = useCallback((next: { label: string; items: { c: Combatant; index: number }[] } | null) => {
    if (removalTimer.current) clearTimeout(removalTimer.current);
    setRemoval(next);
    if (next) removalTimer.current = setTimeout(() => setRemoval(null), 8000);
  }, []);

  // Takes people out of the fight and keeps the turn on whoever was up.
  const removeMany = useCallback((ids: string[], label: string) => {
    const prev = combatantsRef.current;
    const items = prev.map((c, index) => ({ c, index })).filter((x) => ids.includes(x.c.id));
    if (items.length === 0) return;
    const next = prev.filter((c) => !ids.includes(c.id));
    const activeId = prev[turnRef.current]?.id;
    let nextTurn = next.findIndex((c) => c.id === activeId);
    if (nextTurn === -1) {
      const before = prev.slice(0, turnRef.current).filter((c) => !ids.includes(c.id)).length;
      nextTurn = next.length ? Math.min(before, next.length - 1) : 0;
    }
    setCombatants(next);
    setTurn(nextTurn);
    flashRemoval({ label, items });
  }, [flashRemoval]);

  const removeCombatant = useCallback((id: string) => {
    const name = combatantsRef.current.find((c) => c.id === id)?.name ?? 'Combatant';
    removeMany([id], `Removed ${name}`);
  }, [removeMany]);

  const removeDefeated = useCallback(() => {
    const down = combatantsRef.current.filter((c) => c.maxHp > 0 && c.hp === 0).map((c) => c.id);
    removeMany(down, `Removed ${down.length} defeated`);
  }, [removeMany]);

  const undoRemoval = useCallback(() => {
    if (!removal) return;
    const current = combatantsRef.current;
    const activeId = current[turnRef.current]?.id;
    const next = [...current];
    [...removal.items].sort((a, b) => a.index - b.index).forEach(({ c, index }) => next.splice(Math.min(index, next.length), 0, c));
    setCombatants(next);
    const idx = next.findIndex((c) => c.id === activeId);
    setTurn(idx === -1 ? 0 : idx);
    flashRemoval(null);
  }, [removal, flashRemoval]);

  const applyHp = useCallback((id: string, delta: number) => {
    setCombatants((prev) => prev.map((c) =>
      c.id === id ? { ...c, hp: Math.max(0, Math.min(c.maxHp || Infinity, c.hp + delta)) } : c));
  }, []);

  // The next creature's turn: its action economy and legendary actions start fresh,
  // and the round counts up when the order wraps round.
  const nextTurn = useCallback(() => {
    const list = combatantsRef.current;
    if (list.length === 0) return;
    const nextIdx = (turnRef.current + 1) % list.length;
    if (nextIdx === 0) setRound((r) => r + 1);
    setTurn(nextIdx);
    setCombatants((prev) => prev.map((c, i) => (i === nextIdx ? { ...c, res: resetForTurn(c.res) } : c)));
  }, []);

  const endCombat = useCallback(() => {
    setCombatants([]); setTurn(0); setRound(1); setCombatOn(false); setView('stage'); flashRemoval(null);
  }, [flashRemoval]);

  // Orders everyone by initiative, keeping the turn on whoever is up.
  const sortByInit = useCallback(() => {
    const prev = combatantsRef.current;
    const activeId = prev[turnRef.current]?.id;
    const next = [...prev].sort((a, b) => b.init - a.init);
    setCombatants(next);
    setTurn(Math.max(0, next.findIndex((c) => c.id === activeId)));
  }, []);

  const setCombatantRes = useCallback((id: string, res: CombatResources) => {
    setCombatants((prev) => prev.map((c) => (c.id === id ? { ...c, res } : c)));
  }, []);

  const toggleCombatView = useCallback(() => {
    if (!combatOn) { setCombatOn(true); setView('combat'); } else setView((v) => (v === 'combat' ? 'stage' : 'combat'));
  }, [combatOn]);

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
        revealed: false,
        monsterId: m.monsterId,
      }));
    });
    if (added.length === 0) return;
    // Sort the fresh batch among itself for a sensible starting order, then
    // append — existing combatants (PCs the DM already added) keep whatever
    // order they're already in.
    added.sort((a, b) => b.init - a.init);
    setCombatants((prev) => [...prev, ...added]);
    setCombatOn(true);
    setView('combat');
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

  const handleToggleReveal = useCallback((id: string) => {
    setCombatants((prev) => prev.map((c) => (c.id === id ? { ...c, revealed: !c.revealed } : c)));
  }, []);

  // Keep players' (redacted) initiative view in sync with the DM's tracker.
  // Debounced so a burst of edits (drag-reorder, HP ticks) doesn't spam the
  // socket — the server does the actual redaction on every send.
  useEffect(() => {
    if (selected?.role !== 'owner') return;
    // Only what players may see leaves the DM's browser (the server filters again).
    const visible = combatants.map(({ id, name, init, isEnemy, revealed, characterId, hp, maxHp }) => (
      characterId ? { id, name, init, isEnemy, revealed, characterId, hp, maxHp } : { id, name, init, isEnemy, revealed }
    ));
    const t = setTimeout(() => broadcastInitiative(visible as Combatant[], turn, round), 300);
    return () => clearTimeout(t);
  }, [combatants, turn, round, selected?.role, broadcastInitiative]);

  // A player asked to join their own PC in — insert it (once; ignore repeat
  // requests for a character already tracked) as an always-visible ally.
  useEffect(() => {
    if (!characterAddRequest || selected?.role !== 'owner') return;
    setCombatants((prev) => {
      if (prev.some((c) => c.characterId === characterAddRequest.characterId)) return prev;
      return [...prev, {
        id: nextId(),
        name: characterAddRequest.name,
        init: characterAddRequest.initiative ?? rollExpression('1d20')?.total ?? 10,
        hp: characterAddRequest.hp,
        maxHp: characterAddRequest.maxHp,
        armorClass: characterAddRequest.armorClass,
        isEnemy: false,
        revealed: true,
        characterId: characterAddRequest.characterId,
      }];
    });
  }, [characterAddRequest, selected?.role]);

  useEffect(() => { if (combatants.length > 0) setCombatOn(true); }, [combatants.length]);
  // A "done" nudge goes stale once the turn moves on.
  useEffect(() => { clearTurnDone(); }, [turn, clearTurnDone]);

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
          {/* Always the leftmost column for players — stays put whether or
             not an encounter is currently taking over the rest of the view. */}
          <aside className="theatre__initiative-col theatre__player-initiative" aria-label="Initiative">
            <PlayerCombat
              combatants={sharedCombatants}
              turn={sharedTurn}
              round={sharedRound}
              myCharacters={myCharacters}
              onJoin={requestAddCharacter}
              onDone={endTurn}
            />
          </aside>

          <div className="theatre__player-main">
            {myCharacters.length > 0 && (
              <div className="theatre__player-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mainTab === 'table'}
                  className={`theatre__player-tab ${mainTab === 'table' ? 'is-active' : ''}`}
                  onClick={() => setMainTab('table')}
                >
                  Table
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mainTab === 'sheet'}
                  className={`theatre__player-tab ${mainTab === 'sheet' ? 'is-active' : ''} ${isMyTurn ? 'is-my-turn' : ''}`}
                  onClick={() => setMainTab('sheet')}
                >
                  My Character{isMyTurn ? ' — Your Turn!' : ''}
                </button>
              </div>
            )}

            <div className="theatre__player-main-content">
              {mainTab === 'sheet' && sheetCharacterId ? (
                <div className="theatre__player-sheet">
                  <CharacterDetail characterId={sheetCharacterId} />
                </div>
              ) : encounterAsset ? (
                <EncounterTakeover asset={encounterAsset} readOnly />
              ) : (
                <Stage stage={stage} onClear={clearStage} readOnly />
              )}
            </div>
          </div>
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
    <div className="theatre__notes-scroll theatre__nb-wrap">
      <SessionNotebook
        key={activeSession.id}
        value={effectiveNotes ?? ''}
        onChange={handleNotesChange}
        saveLabel={notesSaveLabel}
        campaignId={selected.id}
        onCreateObject={handleCreateItem}
        compact
        startInRun
      />
    </div>
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
            initiativeOpen={combatOn && view === 'combat'}
            onToggleInitiative={toggleCombatView}
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

        <div className="theatre__main">
        {turnDone && (
          <div className="theatre__nudge" role="status">
            <span><strong>{turnDone.name}</strong> says they’re done.</span>
            <button type="button" className="theatre__btn" onClick={() => { nextTurn(); clearTurnDone(); }}>Next turn ›</button>
            <button type="button" className="theatre__mini" onClick={clearTurnDone} aria-label="Dismiss">✕</button>
          </div>
        )}
        {combatOn && (
          <nav className="theatre__viewtabs" aria-label="Views">
            <button type="button" role="tab" aria-selected={view === 'stage'} className={view === 'stage' ? 'is-on' : ''} onClick={() => setView('stage')}>
              <i className="bx bx-theater" aria-hidden="true" /> Stage
            </button>
            <button type="button" role="tab" aria-selected={view === 'combat'} className={view === 'combat' ? 'is-on' : ''} onClick={() => setView('combat')}>
              <i className="bx bx-shield-quarter" aria-hidden="true" /> Combat <small>{combatants.length}</small>
            </button>
            <span className="theatre__viewtabs-now">
              Round {round} · {combatants[turn]?.name ?? '—'}
              <button type="button" className="theatre__mini" onClick={nextTurn} disabled={combatants.length === 0}>Next ›</button>
            </span>
          </nav>
        )}

        {combatOn && view === 'combat' ? (
          <CombatView
            combatants={combatants}
            turn={turn}
            round={round}
            options={combatantOptions}
            optionsLoading={combatantOptionsLoading}
            rawById={rawById}
            undo={removal ? { label: removal.label, run: undoRemoval } : null}
            onAddOption={addFromOption}
            onAddBlank={addBlank}
            onRemove={removeCombatant}
            onRemoveDefeated={removeDefeated}
            onEnd={endCombat}
            onNextTurn={nextTurn}
            onSortByInit={sortByInit}
            onApplyHp={applyHp}
            onEditInit={handleEditInit}
            onReorder={handleReorderCombatants}
            onToggleReveal={handleToggleReveal}
            onViewMonster={setViewMonsterId}
            onSetRes={setCombatantRes}
          />
        ) : (
        <div className="theatre__stage-view">
        {encounterAsset && !encounterMinimized ? (
          <EncounterTakeover
            asset={encounterAsset}
            onMinimize={() => setEncounterMinimized(true)}
            onEnd={() => { removeFromStage(encounterAsset.instanceId); setEncounterMinimized(false); }}
            onRollInitiative={handleRollInitiative}
            onViewMonster={setViewMonsterId}
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
        )}
        </div>
      </div>

      <MonsterDetailSlideOver monsterId={viewMonsterId} onClose={() => setViewMonsterId(null)} />
    </div>
  );
}