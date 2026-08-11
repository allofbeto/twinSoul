import type { ReactNode } from 'react';

export type TheatreTheme = 'default' | 'dos' | 'magic';

export const THEATRE_THEMES: TheatreTheme[] = ['default', 'dos', 'magic'];

export const coerceTheme = (t?: string): TheatreTheme =>
  t && (THEATRE_THEMES as string[]).includes(t) ? (t as TheatreTheme) : 'default';

export const PANE_MIN = 200;
export const PANE_MAX = 560;
export const PANE_DEFAULT = 300;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type AssetKind = 'art' | 'map' | 'npc' | 'encounter';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
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
  /** Optional override. Defaults to the signed-in user's theme (users.theme). */
  theme?: string;
  onExit?: () => void;

  /* --- Campaign gate --- */
  /** Existing campaigns to choose from. Empty → the gate opens on the create form. */
  campaigns?: Campaign[];
  /** True while campaigns are still being fetched — the gate shows a loading state. */
  campaignsLoading?: boolean;
  /** Create a campaign (POST to your API) and resolve with the created record. */
  onCreateCampaign?: (name: string) => Promise<Campaign> | Campaign;
  /** Pass a campaign to skip the gate and go straight to the stage. */
  activeCampaign?: Campaign | null;
  /** Fired when a campaign is chosen or created — lets the parent load its assets/notes. */
  onCampaignSelected?: (campaign: Campaign) => void;
}

export interface RollResult {
  expr: string;
  total: number;
  detail: string;
}

export type DmPanel = null | 'dice' | 'initiative' | 'scratch';

export const KIND_LABEL: Record<AssetKind, string> = {
  art: 'Art', map: 'Maps', npc: 'NPCs', encounter: 'Encounters',
};

export const KIND_ORDER: AssetKind[] = ['art', 'map', 'npc', 'encounter'];