// Quick maps for random fights: a biome plus how busy it is.
// Deterministic for a given seed, so "Generate" again just changes the seed.

import type { GridType } from './grid';
import { blankMap, fillArea, paint, room, type BattleMap, type Lighting } from './map';
import type { TerrainCode } from './terrain';

export type Biome = 'forest' | 'cave' | 'road' | 'tavern' | 'ruins' | 'river';

export const BIOMES: { biome: Biome; label: string; icon: string }[] = [
  { biome: 'forest', label: 'Forest', icon: '🌲' },
  { biome: 'cave', label: 'Cave', icon: '🕳' },
  { biome: 'road', label: 'Road', icon: '🛤' },
  { biome: 'tavern', label: 'Tavern', icon: '🍺' },
  { biome: 'ruins', label: 'Ruins', icon: '🏚' },
  { biome: 'river', label: 'River', icon: '🌊' },
];

export interface GenerateOptions {
  biome: Biome;
  grid: GridType;
  width: number;
  height: number;
  /** 0–1: how many obstacles. */
  obstacles: number;
  /** 0–1: how many hazards. */
  hazards: number;
  lighting: Lighting;
  seed: number;
}

function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function generateMap(o: GenerateOptions): BattleMap {
  const r = rng(o.seed);
  const W = o.width, H = o.height;
  const scatter = (m: BattleMap, code: TerrainCode, chance: number, on: string[] = ['g']) => {
    const cells: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on.includes(m.cells[y][x]) && r() < chance) cells.push([x, y]);
    return paint(m, cells, code);
  };
  // Small blobs (mud, pools, rubble).
  const blobs = (m: BattleMap, code: TerrainCode, count: number, size: number, on: string[] = ['g']) => {
    for (let i = 0; i < count; i++) {
      const cx = Math.floor(r() * W), cy = Math.floor(r() * H);
      const cells: [number, number][] = [];
      for (let y = cy - size; y <= cy + size; y++) for (let x = cx - size; x <= cx + size; x++) {
        if (x >= 0 && y >= 0 && x < W && y < H && on.includes(m.cells[y][x]) && Math.hypot(x - cx, y - cy) <= size + r() * 0.8 - 0.4) cells.push([x, y]);
      }
      m = paint(m, cells, code);
    }
    return m;
  };
  const ob = o.obstacles, hz = o.hazards;
  let m = blankMap('Quick map', o.grid, W, H, 'g');

  switch (o.biome) {
    case 'forest':
      m = blobs(m, 'm', Math.round(1 + hz * 3), 1);
      m = scatter(m, 'T', 0.04 + ob * 0.16);
      m = scatter(m, 'b', 0.01 + ob * 0.03);
      m = blobs(m, 'o', Math.round(hz * 2), 0);
      break;
    case 'road': {
      let y = Math.floor(H / 2 + (r() - 0.5) * 3);
      const road: [number, number][] = [];
      for (let x = 0; x < W; x++) {
        if (r() < 0.3) y = Math.max(2, Math.min(H - 3, y + (r() < 0.5 ? -1 : 1)));
        road.push([x, y], [x, y + 1]);
      }
      m = paint(m, road, 'd');
      m = scatter(m, 'T', 0.03 + ob * 0.12);
      m = scatter(m, 'b', 0.01 + ob * 0.03);
      // An overturned cart: a few crates on the road.
      const cx = Math.floor(W / 3 + r() * W / 3);
      const cy = road.find(([x]) => x === cx)?.[1] ?? Math.floor(H / 2);
      m = paint(m, [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1]], 'c');
      m = blobs(m, 'm', Math.round(hz * 3), 1, ['g', 'd']);
      break;
    }
    case 'river': {
      let y = Math.floor(H / 2);
      const deep: [number, number][] = [], shallow: [number, number][] = [];
      for (let x = 0; x < W; x++) {
        if (r() < 0.35) y = Math.max(2, Math.min(H - 4, y + (r() < 0.5 ? -1 : 1)));
        deep.push([x, y], [x, y + 1]);
        shallow.push([x, y - 1], [x, y + 2]);
      }
      m = paint(paint(m, shallow, '~'), deep, 'W');
      // A bridge or a ford.
      const bx = Math.floor(W / 4 + r() * W / 2);
      const crossing: [number, number][] = [];
      for (let yy = 0; yy < H; yy++) if (['W', '~'].includes(m.cells[yy][bx])) crossing.push([bx, yy], [bx + 1, yy]);
      m = paint(m, crossing, r() < 0.6 ? 'B' : '~');
      m = scatter(m, 'T', 0.03 + ob * 0.12);
      m = scatter(m, 'b', 0.01 + ob * 0.04);
      m = blobs(m, 'm', Math.round(hz * 3), 1);
      break;
    }
    case 'cave': {
      // Cellular automaton: random rock, smoothed into caverns.
      let rock = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => x === 0 || y === 0 || x === W - 1 || y === H - 1 || r() < 0.38 + ob * 0.12));
      const smooth = (grid: boolean[][]) => grid.map((row, y) => row.map((_, x) => {
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return true;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && grid[y + dy][x + dx]) n++;
        return n >= 5;
      }));
      for (let it = 0; it < 4; it++) rock = smooth(rock);
      m = { ...m, cells: rock.map((row) => row.map((w) => (w ? '#' : 's')).join('')) };
      // Keep the biggest open cave; fill smaller pockets with rock.
      const seen = new Set<string>();
      let best: [number, number][] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (m.cells[y][x] !== 's' || seen.has(`${x},${y}`)) continue;
        const area = fillArea(m, [x, y]);
        area.forEach(([ax, ay]) => seen.add(`${ax},${ay}`));
        if (area.length > best.length) best = area;
      }
      const keep = new Set(best.map(([x, y]) => `${x},${y}`));
      const pockets: [number, number][] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m.cells[y][x] === 's' && !keep.has(`${x},${y}`)) pockets.push([x, y]);
      m = paint(m, pockets, '#');
      m = blobs(m, ',', Math.round(1 + ob * 4), 1, ['s']);
      m = blobs(m, '~', Math.round(hz * 2), 1, ['s']);
      m = scatter(m, 'o', hz * 0.015, ['s']);
      if (o.lighting === 'bright') m = { ...m, lighting: 'dark' };
      break;
    }
    case 'tavern': {
      m = room(m, [1, 1], [W - 2, H - 2], '.');
      // A back room for the kitchen / stores.
      const split = Math.floor(W * 0.68);
      const wall: [number, number][] = [];
      for (let y = 1; y < H - 1; y++) wall.push([split, y]);
      m = paint(m, wall, '#');
      m = paint(m, [[split, Math.floor(H / 2)], [Math.floor(W / 3), H - 2]], 'D');
      m = paint(m, [[0, 0]], 'g');
      const tables: [number, number][] = [];
      for (let y = 3; y < H - 3; y += 3) for (let x = 3; x < split - 2; x += 4) if (r() < 0.5 + ob * 0.5) tables.push([x, y], [x + 1, y]);
      m = paint(m, tables, 't');
      m = scatter(m, 'c', 0.015 + ob * 0.04, ['.']);
      m = paint(m, [[Math.floor(split / 2), 2]], 'f'); // hearth against the north wall
      m = paint(m, [[2, 2], [split - 2, H - 3]], 'l');
      break;
    }
    case 'ruins': {
      for (let i = 0; i < 2 + Math.round(ob * 3); i++) {
        const w = 4 + Math.floor(r() * 6), h = 4 + Math.floor(r() * 5);
        const x0 = Math.floor(r() * (W - w)), y0 = Math.floor(r() * (H - h));
        m = room(m, [x0, y0], [x0 + w, y0 + h], 's');
      }
      // Crumble the walls: gaps and rubble.
      const walls: [number, number][] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m.cells[y][x] === '#' && r() < 0.3) walls.push([x, y]);
      m = paint(m, walls, ',');
      m = scatter(m, 'P', 0.01 + ob * 0.02, ['s']);
      m = scatter(m, 'T', 0.02 + ob * 0.05);
      m = blobs(m, ',', Math.round(1 + hz * 3), 1, ['g', 's']);
      m = scatter(m, '^', hz * 0.01, ['s']);
      break;
    }
  }
  return {
    ...m,
    name: `${BIOMES.find((b) => b.biome === o.biome)?.label} map`,
    lighting: m.lighting === 'dark' ? 'dark' : o.lighting,
    settings: { ...m.settings, quick: { biome: o.biome, obstacles: o.obstacles, hazards: o.hazards } },
  };
}

// ---------------- recipes: answers from the dungeon helper ----------------

export type Structure = 'none' | 'hut' | 'rooms' | 'ruins';
export type HazardKind = 'pit' | 'fire' | 'water' | 'mud' | 'rubble' | 'trap' | 'high';
export type Cover = 'open' | 'some' | 'lots';

export interface MapRecipe {
  biome: Biome;
  structure?: Structure;
  /** How many rooms the building (or tavern) has. */
  rooms?: number;
  hazards?: HazardKind[];
  cover?: Cover;
  lighting: Lighting;
  grid: GridType;
  width: number;
  height: number;
  seed: number;
}

const COVER_LEVEL: Record<Cover, number> = { open: 0.12, some: 0.5, lots: 0.9 };
const INDOOR: Biome[] = ['tavern', 'cave'];

/**
 * Splits the inside of a walled rectangle into `n` rooms with doors between
 * them (largest room split first, along its longer side). Returns the rooms'
 * interiors, biggest first.
 */
export function partition(m: BattleMap, x0: number, y0: number, x1: number, y1: number, n: number, rand: () => number) {
  let out = m;
  let rects = [{ x0: x0 + 1, y0: y0 + 1, x1: x1 - 1, y1: y1 - 1 }];
  const area = (r: typeof rects[0]) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  for (let i = 1; i < n; i++) {
    rects.sort((a, b) => area(b) - area(a));
    const r = rects[0];
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    const vertical = w >= h;
    const span = vertical ? w : h;
    if (span < 7) break; // too small to split into two usable rooms
    const at = (vertical ? r.x0 : r.y0) + 3 + Math.floor(rand() * (span - 6));
    const wall: [number, number][] = [];
    if (vertical) for (let y = r.y0; y <= r.y1; y++) wall.push([at, y]);
    else for (let x = r.x0; x <= r.x1; x++) wall.push([x, at]);
    out = paint(out, wall, '#');
    const door = wall[1 + Math.floor(rand() * Math.max(1, wall.length - 2))];
    out = paint(out, [door], 'D');
    rects = [
      vertical ? { ...r, x1: at - 1 } : { ...r, y1: at - 1 },
      vertical ? { ...r, x0: at + 1 } : { ...r, y0: at + 1 },
      ...rects.slice(1),
    ];
  }
  return { map: out, rooms: rects.sort((a, b) => area(b) - area(a)) };
}

/** A map built from the helper's answers: the place first, then rooms and hazards on top. */
export function generateFromRecipe(r: MapRecipe): BattleMap {
  const rand = rng(r.seed * 7 + 3);
  const W = r.width, H = r.height;
  const indoor = INDOOR.includes(r.biome);
  let m = generateMap({ biome: r.biome, grid: r.grid, width: W, height: H, obstacles: COVER_LEVEL[r.cover ?? 'some'], hazards: 0, lighting: r.lighting, seed: r.seed });
  const ground = indoor ? ['.', 's'] : ['g', 'd'];
  const at = (x: number, y: number) => m.cells[y]?.[x];
  const cellsWhere = (ok: (c: string, x: number, y: number) => boolean) => {
    const out: [number, number][] = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ok(at(x, y), x, y)) out.push([x, y]);
    return out;
  };
  const pickCells = (pool: [number, number][], n: number) => {
    const out: [number, number][] = [];
    const copy = pool.slice();
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    return out;
  };
  const blob = (cx: number, cy: number, radius: number, code: TerrainCode, on: string[]) => {
    const cells: [number, number][] = [];
    for (let y = cy - radius - 1; y <= cy + radius + 1; y++) for (let x = cx - radius - 1; x <= cx + radius + 1; x++) {
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && on.includes(at(x, y)) && Math.hypot(x - cx, y - cy) <= radius + rand() * 0.7 - 0.3) cells.push([x, y]);
    }
    m = paint(m, cells, code);
  };
  const spot = (margin = 3): [number, number] => [margin + Math.floor(rand() * Math.max(1, W - 2 * margin)), margin + Math.floor(rand() * Math.max(1, H - 2 * margin))];
  // A centre that's actually on open ground, so the hazard has somewhere to go.
  const groundSpot = (margin = 2): [number, number] => {
    const pool = cellsWhere((c, x, y) => ground.includes(c) && x >= margin && y >= margin && x < W - margin && y < H - margin);
    return pool.length ? pool[Math.floor(rand() * pool.length)] : spot(margin);
  };

  // Buildings: a tavern is rebuilt with the rooms asked for; outdoors a hut is
  // one room and a building has as many rooms as asked (3 if no number).
  const s = r.structure ?? 'none';
  const furnish = (rooms: { x0: number; y0: number; x1: number; y1: number }[]) => {
    rooms.forEach((rm, i) => {
      const inside = (x: number, y: number) => x >= rm.x0 && x <= rm.x1 && y >= rm.y0 && y <= rm.y1 && at(x, y) === '.';
      const spots = cellsWhere((c, x, y) => inside(x, y) && x > rm.x0 && x < rm.x1 && y > rm.y0 && y < rm.y1);
      const n = Math.max(1, Math.round(spots.length * (i === 0 ? 0.08 : 0.05) * (0.5 + COVER_LEVEL[r.cover ?? 'some'])));
      m = paint(m, pickCells(spots, n), i === 0 ? 't' : rand() < 0.5 ? 'c' : 't');
    });
  };
  if (r.biome === 'tavern') {
    const n = Math.max(1, Math.min(8, r.rooms ?? (s === 'none' ? 1 : s === 'rooms' ? 3 : 2)));
    m = paint(m, cellsWhere(() => true), 'g');
    m = room(m, [1, 1], [W - 2, H - 2], '.');
    const built = partition(m, 1, 1, W - 2, H - 2, n, rand);
    m = built.map;
    m = paint(m, [[Math.floor(W / 3), H - 2]], 'D');
    furnish(built.rooms);
    const main = built.rooms[0];
    m = paint(m, [[Math.floor((main.x0 + main.x1) / 2), main.y0]], 'f'); // hearth
    m = paint(m, [[main.x0, main.y0], [main.x1, main.y1]].filter(([x, y]) => at(x, y) === '.') as [number, number][], 'l');
  } else if (!indoor && (s === 'hut' || s === 'rooms')) {
    const n = s === 'hut' ? 1 : Math.max(2, Math.min(8, r.rooms ?? 3));
    const w = Math.min(W - 4, s === 'hut' ? 7 + Math.floor(rand() * 2) : 8 + n * 3);
    const h = Math.min(H - 4, s === 'hut' ? 6 : 7 + Math.ceil(n / 2) * 2);
    const x0 = Math.max(1, Math.floor((W - w) / 2 + (rand() - 0.5) * (W - w) * 0.5));
    const y0 = Math.max(1, Math.floor((H - h) / 2 + (rand() - 0.5) * (H - h) * 0.5));
    m = room(m, [x0, y0], [x0 + w, y0 + h], '.');
    const built = partition(m, x0, y0, x0 + w, y0 + h, n, rand);
    m = built.map;
    m = paint(m, [[x0 + Math.floor(w / 2), y0 + h], [x0, y0 + Math.floor(h / 2)]], 'D');
    furnish(built.rooms);
  } else if (!indoor && s === 'ruins') {
    for (let i = 0; i < 2; i++) {
      const w = 4 + Math.floor(rand() * 5), h = 4 + Math.floor(rand() * 4);
      const [x0, y0] = spot(2);
      m = room(m, [x0, y0], [Math.min(W - 2, x0 + w), Math.min(H - 2, y0 + h)], 's');
    }
    const broken = cellsWhere((c) => c === '#').filter(() => rand() < 0.35);
    m = paint(m, broken, ',');
  }

  const want = new Set(r.hazards ?? []);
  if (want.has('high')) {
    const [cx, cy] = groundSpot(3);
    blob(cx, cy, 2 + Math.floor(rand() * 2), 'h', indoor ? ['s'] : ['g', 'd']);
  }
  if (want.has('water') && r.biome !== 'river') {
    const [cx, cy] = groundSpot(3);
    const big = 1 + Math.floor(rand() * 2);
    blob(cx, cy, big + 1, '~', [...ground, 'm', ',']);
    blob(cx, cy, big, 'W', ['~']);
  }
  if (want.has('mud')) for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) { const [cx, cy] = groundSpot(); blob(cx, cy, 1, indoor ? ',' : 'm', ground); }
  if (want.has('rubble')) for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) { const [cx, cy] = groundSpot(); blob(cx, cy, 1, ',', ground); }
  if (want.has('pit')) m = paint(m, pickCells(cellsWhere((c) => ground.includes(c)), 1 + Math.floor(rand() * 3)), 'o');
  if (want.has('fire')) {
    const [cx, cy] = groundSpot(2);
    blob(cx, cy, indoor ? 0 : 1, 'f', [...ground, 't', 'c']);
  }
  if (want.has('trap')) {
    // Traps go where people walk: away from the edges, on open floor.
    const pool = cellsWhere((c, x, y) => ground.includes(c) && x > W * 0.25 && x < W * 0.75 && y > 1 && y < H - 2);
    m = paint(m, pickCells(pool, 2 + Math.floor(rand() * 2)), '^');
  }
  // Dark interiors get a couple of torches so the fight isn't pitch black.
  if (r.lighting === 'dark' && indoor && !cellsWhere((c) => c === 'l' || c === 'f').length) {
    m = paint(m, pickCells(cellsWhere((c) => ground.includes(c)), 2), 'l');
  }
  return { ...m, settings: { ...m.settings, recipe: { ...r, seed: undefined } } } as BattleMap;
}
