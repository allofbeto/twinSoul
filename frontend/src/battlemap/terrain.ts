// The battle-map palette: every terrain code, how it looks and what it does in a fight.
// Keep the codes in sync with BattleMap::TERRAIN in the backend.

export type TerrainCode =
  | 'g' | '.' | 's' | 'd' | 'h'
  | ',' | 'm' | '~' | 'W' | 'o'
  | '#' | 'D' | 'c' | 't' | 'P' | 'b' | 'T'
  | 'f' | '^' | 'l' | 'B';

export type TerrainGroup = 'ground' | 'movement' | 'walls' | 'hazards';

export interface TerrainInfo {
  code: TerrainCode;
  name: string;
  group: TerrainGroup;
  fill: string;
  /** Movement multiplier: 1 normal, 2 difficult, Infinity can't enter. */
  move: number;
  /** Swimming (10 ft per square without a swim speed). */
  swim?: boolean;
  blocksSight?: boolean;
  /** Cover a creature gets when this square is between it and an attacker: +2 half, +5 three-quarters. */
  cover?: 2 | 5;
  hazard?: 'pit' | 'fire' | 'trap';
  /** Light it gives off by default, in feet. */
  light?: { bright: number; dim: number };
  /** DM-only until revealed. */
  secret?: boolean;
  /** Plain-language rule shown in the builder. */
  rule: string;
}

export const TERRAIN: TerrainInfo[] = [
  { code: 'g', name: 'Grass', group: 'ground', fill: '#3f5a2c', move: 1, rule: 'Normal ground.' },
  { code: '.', name: 'Wood floor', group: 'ground', fill: '#7a5634', move: 1, rule: 'Normal ground.' },
  { code: 's', name: 'Stone floor', group: 'ground', fill: '#5d5a6b', move: 1, rule: 'Normal ground.' },
  { code: 'd', name: 'Dirt / road', group: 'ground', fill: '#7a6a48', move: 1, rule: 'Normal ground.' },
  { code: 'h', name: 'High ground', group: 'ground', fill: '#7d8a52', move: 1, rule: 'Raised by a set height (default +10 ft). Climbing up costs extra movement; falling off deals 1d6 per 10 ft.' },
  { code: ',', name: 'Rubble', group: 'movement', fill: '#6f5a45', move: 2, rule: 'Difficult terrain: each square costs 10 ft.' },
  { code: 'm', name: 'Mud', group: 'movement', fill: '#5a4630', move: 2, rule: 'Difficult terrain: each square costs 10 ft.' },
  { code: '~', name: 'Shallow water', group: 'movement', fill: '#3b7593', move: 2, rule: 'Difficult terrain: each square costs 10 ft.' },
  { code: 'W', name: 'Deep water', group: 'movement', fill: '#1f4e6b', move: 2, swim: true, rule: 'Swimming: each square costs 10 ft unless the creature has a swim speed.' },
  { code: 'o', name: 'Pit / hole', group: 'movement', fill: '#7a5634', move: 1, hazard: 'pit', rule: 'Entering it: fall damage 1d6 per 10 ft of depth (default 10 ft), or a DEX save to catch the edge.' },
  { code: 'B', name: 'Bridge', group: 'movement', fill: '#8a6a3a', move: 1, rule: 'Normal ground over water or a drop.' },
  { code: '#', name: 'Wall', group: 'walls', fill: '#241b31', move: Infinity, blocksSight: true, rule: 'Blocks movement and sight.' },
  { code: 'D', name: 'Door', group: 'walls', fill: '#7a5634', move: 1, rule: 'Open, closed or locked. A closed door blocks sight; a locked one also blocks movement until opened (DC set per door).' },
  { code: 'c', name: 'Crate / barrel', group: 'walls', fill: '#7a5634', move: 2, cover: 2, rule: 'Half cover (+2 AC and DEX saves) behind it. Climbing over is difficult terrain.' },
  { code: 't', name: 'Table', group: 'walls', fill: '#7a5634', move: 2, cover: 2, rule: 'Half cover (+2 AC and DEX saves) behind it. Climbing over is difficult terrain.' },
  { code: 'P', name: 'Pillar', group: 'walls', fill: '#5d5a6b', move: Infinity, blocksSight: true, cover: 5, rule: 'Blocks the square and sight. Three-quarters cover (+5) behind it.' },
  { code: 'b', name: 'Boulder', group: 'walls', fill: '#3f5a2c', move: Infinity, blocksSight: true, cover: 5, rule: 'Blocks the square and sight. Three-quarters cover (+5) behind it.' },
  { code: 'T', name: 'Tree', group: 'walls', fill: '#3f5a2c', move: Infinity, cover: 2, rule: 'Blocks the square. Half cover (+2) behind it.' },
  { code: 'f', name: 'Fire', group: 'hazards', fill: '#7a5634', move: 1, hazard: 'fire', light: { bright: 20, dim: 20 }, rule: 'Entering it or starting a turn in it: 1d10 fire damage. Sheds bright light 20 ft, dim 20 ft more.' },
  { code: '^', name: 'Trap', group: 'hazards', fill: '#7a5634', move: 1, hazard: 'trap', secret: true, rule: 'Hidden from players until spotted or triggered. Set the DCs and effect per trap.' },
  { code: 'l', name: 'Torch / brazier', group: 'hazards', fill: '#5d5a6b', move: 1, light: { bright: 20, dim: 20 }, rule: 'A light source: bright light 20 ft, dim 20 ft more. Can be lit or put out in play.' },
];

export const TERRAIN_BY_CODE: Record<string, TerrainInfo> = Object.fromEntries(TERRAIN.map((t) => [t.code, t]));

export const terrain = (code: string): TerrainInfo => TERRAIN_BY_CODE[code] ?? TERRAIN_BY_CODE.g;

export const GROUP_LABEL: Record<TerrainGroup, string> = {
  ground: 'Ground',
  movement: 'Movement',
  walls: 'Walls & cover',
  hazards: 'Hazards & light',
};

/** Per-cell settings, stored in the map's `props` under "x,y". */
export interface CellProps {
  /** Doors. */
  state?: 'open' | 'closed' | 'locked';
  lockDc?: number;
  /** Pits and high ground, in feet. */
  depth?: number;
  height?: number;
  /** Fire. */
  damage?: string;
  /** Traps. */
  spotDc?: number;
  disarmDc?: number;
  effect?: string;
  /** Light sources. */
  bright?: number;
  dim?: number;
  lit?: boolean;
  /** Free-text label shown on the map. */
  label?: string;
}
