import type { MutableRefObject, ReactNode } from 'react';

export type TheatreTheme = 'default' | 'dos' | 'magic';

export const THEATRE_THEMES: TheatreTheme[] = ['default', 'dos', 'magic'];

export const coerceTheme = (t?: string): TheatreTheme =>
  t && (THEATRE_THEMES as string[]).includes(t) ? (t as TheatreTheme) : 'default';

export const PANE_MIN = 200;
export const PANE_MAX = 560;
export const PANE_DEFAULT = 300;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type AssetKind = 'art' | 'map' | 'npc' | 'encounter' | 'item';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  role?: 'owner' | 'player';
}

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
  /** Encounter-kind assets only: the phase's monster list, embedded so the
   * encounter takeover can offer "Roll Initiative" and stat-block lookups
   * without fetching anything else. */
  combatants?: EncounterCombatantSeed[];
}

export interface EncounterCombatantSeed {
  name: string;
  quantity: number;
  maxHp: number | null;
  armorClass: number | null;
  /** Bestiary monster id, when this combatant came from the SRD — lets the
   * DM pull up its full stat block mid-fight. Null for homebrew/custom. */
  monsterId: string | null;
}

/** A RevealAsset placed on the stage. Multiple copies of the same asset can be
 * on stage at once, so each placement gets its own instanceId for keying/removal.
 * x/y are percentages (0-100) of the stage area, top-left anchored. */
export interface StagedAsset extends RevealAsset {
  instanceId: string;
  x: number;
  y: number;
}

export interface NewItemInput {
  name: string;
  kind: AssetKind;
  categories?: string[];
  notes?: string;
  attunement?: boolean;
  consumable?: boolean;
  imageUrl?: string;
}

export interface Combatant {
  id: string;
  name: string;
  init: number;
  hp: number;
  maxHp: number;
  armorClass?: number | null;
  isEnemy?: boolean;
  /** Bestiary monster id, when added from an encounter — lets the DM view
   * its stat block from the initiative list. */
  monsterId?: string | null;
}

export interface Session {
  id: string;
  campaignId: string;
  title: string;
  notes?: string;          // plain text (sessions.notes)
  sessionNumber?: number;  // sessions.session_number
  playedOn?: string;       // sessions.played_on (date)
  updatedAt?: string;
}

export interface SessionTheatreProps {
  sessionTitle?: string;
  campaignName?: string;
  /** …pass your own rendered notes node to override the session's notes. */
  notes?: ReactNode;
  assets?: RevealAsset[];
  /** Optional override. Defaults to the signed-in user's theme (users.theme). */
  theme?: string;
  onExit?: () => void;
  /** Pass a campaign to skip the gate and go straight to the stage. */
  activeCampaign?: Campaign | null;
  /** Fired when a campaign is chosen or created. */
  onCampaignSelected?: (campaign: Campaign) => void;
}

export interface RollResult {
  expr: string;
  total: number;
  detail: string;
}

export type DmPanel = null | 'dice' | 'scratch';

export interface TheatreEncounterMonster {
  id: string;
  name: string;
  challengeRating: string | null;
  maxHp: number | null;
  armorClass: number | null;
  quantity: number;
  monsterId: string | null;
}

export interface TheatreEncounterPhase {
  id: string;
  name: string;
  position: number;
  notes?: string;
  monsters: TheatreEncounterMonster[];
}

export interface TheatreEncounter {
  id: string;
  name: string;
  notes?: string;
  campaignId: string | null;
  sessionId: string | null;
  phases: TheatreEncounterPhase[];
}

/** Everything the initiative tracker needs — bundled so it can be rendered
 * from either the sidenav flyout or embedded full-height in the encounter
 * takeover without threading a dozen individual props through both. */
export interface InitiativeState {
  combatants: Combatant[];
  turn: number;
  cName: string;
  cInit: string;
  cHp: string;
  cAc: string;
  cEnemy: boolean;
  onNameChange: (value: string) => void;
  onInitChange: (value: string) => void;
  onHpChange: (value: string) => void;
  onAcChange: (value: string) => void;
  onToggleEnemy: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onApplyHp: (id: string, delta: number) => void;
  onEditInit: (id: string, init: number) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  /** Backfills a combatant's AC/HP from its bestiary monster record when the
   * encounter snapshot didn't have them (e.g. an encounter built before AC/HP
   * snapshotting existed). Only fills gaps — never overwrites a value the DM
   * already set. */
  onInheritStats: (id: string, stats: { armorClass: number | null; maxHp: number }) => void;
  onViewMonster?: (monsterId: string) => void;
  onNextTurn: () => void;
  onReset: () => void;
  dmgRefs: MutableRefObject<Record<string, string>>;
}

export const KIND_LABEL: Record<AssetKind, string> = {
  art: 'Art', map: 'Maps', npc: 'NPCs', encounter: 'Encounters', item: 'Items',
};

export const KIND_ORDER: AssetKind[] = ['art', 'map', 'npc', 'encounter', 'item'];