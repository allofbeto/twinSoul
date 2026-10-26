// One accent color per campaign, used wherever a campaign shows up (sessions,
// campaign page, …). A campaign can pick its own; otherwise one is derived from
// its id so every campaign still gets a stable color.

export const CAMPAIGN_SWATCHES = [
  '#e0668a', '#ef4444', '#f97316', '#e8be7d', '#c9a94a', '#84cc16',
  '#22c55e', '#14b8a6', '#38bdf8', '#6366f1', '#8b6ff0', '#c084fc',
];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHexColor = (v?: string | null): v is string => !!v && HEX.test(v);

/** Deterministic fallback color from the campaign id. */
export const autoCampaignColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 58%)`;
};

/** The campaign's chosen color, or its auto color. */
export const campaignColor = (id: string, color?: string | null) => (isHexColor(color) ? color : autoCampaignColor(id));
