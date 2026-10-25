export interface GameSystem {
  key: string;
  name: string;
  tagline: string;
  enabled: boolean;
}

// New system? Add it here. It'll show up (disabled, "coming soon") in the
// game picker immediately; flip `enabled` once it has a creation flow and
// reference data of its own.
export const GAME_SYSTEMS: GameSystem[] = [
  {
    key: 'dnd_5e',
    name: 'D&D 5th Edition',
    tagline: 'Classes, levels, spellcasting — the SRD ruleset.',
    enabled: true,
  },
  {
    key: 'coc_7e',
    name: 'Call of Cthulhu (7e)',
    tagline: 'Investigators, sanity, skill percentages.',
    enabled: false,
  },
  {
    key: 'pf2e',
    name: 'Pathfinder 2e',
    tagline: 'Ancestries, backgrounds, the three-action economy.',
    enabled: false,
  },
];

export const getGameSystem = (key: string | null | undefined) => GAME_SYSTEMS.find((g) => g.key === key);
