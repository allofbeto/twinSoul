import type { ReactNode } from 'react';

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

/** Something the DM can search for and drop into the initiative tracker. */
export type CombatantSource = 'beast' | 'npc' | 'character';

export interface CombatantOption {
  key: string;
  source: CombatantSource;
  name: string;
  subtitle: string;
  armorClass: number | null;
  /** Current HP for a character, full HP for the rest. */
  maxHp: number;
  dexterity: number | null;
  imageUrl?: string;
  /** Starts as an enemy (hidden from players until revealed). */
  isEnemy: boolean;
  monsterId?: string | null;
  /** NPC or homebrew monster item in this campaign (its stat block is looked up from the DM's own items). */
  itemId?: string | null;
  characterId?: string | null;
}

/** A DM-controlled creature's spent actions and resources. Lives only in the DM's tracker. */
/** Which stat block a combatant's details button opens. */
export interface DetailTarget {
  kind: 'monster' | 'npc' | 'character';
  id: string;
  title: string;
}

export interface CombatResources {
  /** Action economy used this turn; cleared when the creature's turn comes round. */
  econ?: { action?: boolean; bonus?: boolean; reaction?: boolean; move?: boolean };
  /** Uses spent per ability key (limited uses, or 1 when a recharge ability is spent). */
  used?: Record<string, number>;
  /** Spell slots spent, by level. */
  slotsUsed?: Record<string, number>;
  /** Legendary actions spent this round; cleared at the start of the creature's turn. */
  legendaryUsed?: number;
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
  /** NPC / homebrew monster item, for looking up its actions. */
  itemId?: string | null;
  /** Statuses (Prone, Stunned...). Shared with players for characters and revealed creatures. */
  conditions?: string[];
  /** Exhaustion level, 0 to 6. */
  exhaustion?: number;
  /** Temporary HP: soaks damage first and shows on top of the maximum (120 max + 10 temp reads 130/120). */
  tempHp?: number;
  /** Spent actions and resources (DM-controlled creatures). */
  res?: CombatResources;
  /** Whether players are allowed to see this combatant's real name. Only
   * meaningful for enemies — allies are always shown as themselves. The
   * server enforces this: an unrevealed enemy's name never reaches a
   * player's connection, redacted or not client-side. */
  revealed?: boolean;
  /** Set when this row is a player's own PC (added via the join-initiative
   * flow) — lets the tracker dedupe against repeat join requests. */
  characterId?: string | null;
  /** Square on the battle map, when the fight has one. */
  pos?: [number, number] | null;
}

/** What a player's join-initiative request resolves to, looked up
 * server-side from the character record so it can't be spoofed. */
export interface CharacterAddPayload {
  characterId: string;
  name: string;
  hp: number;
  maxHp: number;
  armorClass: number | null;
  /** The player's own roll, when they gave one. */
  initiative?: number | null;
}

/** One of the current player's own characters in this campaign. */
export interface MyCharacter {
  id: string;
  name: string;
  user_id: string;
}

export interface Session {
  id: string;
  campaignId: string;
  title: string;
  notes?: string;          // plain text (sessions.notes)
  sessionNumber?: number;  // sessions.session_number
  playedOn?: string;       // sessions.played_on (date)
  updatedAt?: string;
  /** The fight in progress, saved with the session until the DM ends it. */
  combat?: SavedCombat | null;
}

/** What the initiative tracker saves on the session. */
export interface SavedCombat {
  combatants: Combatant[];
  turn: number;
  round: number;
  /** The battle map the fight is on, if any. */
  map?: CombatMapRef | null;
}

export interface CombatMapRef {
  id: string;
  name: string;
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
  /** Each physical die rolled, in order (absent for flat numbers). */
  dice?: { sides: number; value: number }[];
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
export const KIND_LABEL: Record<AssetKind, string> = {
  art: 'Art', map: 'Maps', npc: 'NPCs', encounter: 'Encounters', item: 'Items',
};

export const KIND_ORDER: AssetKind[] = ['art', 'map', 'npc', 'encounter', 'item'];