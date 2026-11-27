// Fight rules read straight off a battle map: movement cost, cover, light and
// vision. Pure functions so the builder, Combat and the tests share one truth.

import { CELL_PX, cellKey, geometry, type Cell } from './grid';
import { codeAt, inBounds, type BattleMap } from './map';
import { terrain } from './terrain';

const FT = 5;

// ---------------- doors & blocking ----------------

const doorState = (m: BattleMap, x: number, y: number) => m.props[cellKey(x, y)]?.state ?? 'closed';

/** Whether a creature can enter this cell at all. */
export function passable(m: BattleMap, x: number, y: number): boolean {
  if (!inBounds(m, x, y)) return false;
  const code = codeAt(m, x, y);
  if (code === 'D') return doorState(m, x, y) !== 'locked';
  return terrain(code).move !== Infinity;
}

/** Whether this cell stops line of sight. */
export function blocksSight(m: BattleMap, x: number, y: number): boolean {
  if (!inBounds(m, x, y)) return true;
  const code = codeAt(m, x, y);
  if (code === 'D') return doorState(m, x, y) !== 'open';
  return !!terrain(code).blocksSight;
}

// ---------------- movement ----------------

export interface MoveResult {
  feet: number;
  difficult: number;
  /** Index into the path of the first step that can't be taken, or null. */
  blockedAt: number | null;
  hazards: { cell: Cell; kind: 'pit' | 'fire' | 'trap' }[];
}

/**
 * Cost of walking a path of adjacent cells. `path[0]` is where the creature
 * starts and costs nothing. Difficult terrain doubles a step; deep water does
 * too unless the creature can swim; climbing onto high ground costs its height.
 */
export function moveCost(m: BattleMap, path: Cell[], opts: { swimSpeed?: boolean } = {}): MoveResult {
  const g = geometry(m.grid);
  const fiveTen = m.grid === 'square' && m.settings.diagonals === '5-10-5';
  let feet = 0, difficult = 0, diagonals = 0;
  const hazards: MoveResult['hazards'] = [];
  for (let i = 1; i < path.length; i++) {
    const [x, y] = path[i], [px, py] = path[i - 1];
    if (!passable(m, x, y) || g.steps(path[i - 1], path[i]) !== 1) return { feet, difficult, blockedAt: i, hazards };
    let step = FT;
    if (fiveTen && x !== px && y !== py) step = diagonals++ % 2 === 1 ? 10 : 5;
    const t = terrain(codeAt(m, x, y));
    const hard = t.move === 2 && !(t.swim && opts.swimSpeed);
    if (hard) { step *= 2; difficult++; }
    if (t.code === 'h' && codeAt(m, px, py) !== 'h') step += m.props[cellKey(x, y)]?.height ?? 10;
    feet += step;
    if (t.hazard) hazards.push({ cell: [x, y], kind: t.hazard });
  }
  return { feet, difficult, blockedAt: null, hazards };
}

// ---------------- line helpers ----------------

/** Cells a segment between two pixel points passes through, excluding the end cells. */
function crossed(m: BattleMap, ax: number, ay: number, bx: number, by: number, from: Cell, to: Cell): Cell[] {
  const g = geometry(m.grid);
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / (CELL_PX / 4)));
  const out: Cell[] = [];
  let last = '';
  for (let i = 1; i < n; i++) {
    const c = g.cellAt(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
    const k = cellKey(...c);
    if (k === last || (c[0] === from[0] && c[1] === from[1]) || (c[0] === to[0] && c[1] === to[1])) continue;
    last = k;
    out.push(c);
  }
  return out;
}

/** Points a viewer can aim at in a target cell: its centre and four inner points. */
function aimPoints(m: BattleMap, [x, y]: Cell): [number, number][] {
  const [cx, cy] = geometry(m.grid).center(x, y);
  const o = CELL_PX * 0.3;
  return [[cx, cy], [cx - o, cy - o], [cx + o, cy - o], [cx - o, cy + o], [cx + o, cy + o]];
}

// ---------------- cover ----------------

export type Cover = 0 | 2 | 5 | 'total';

/**
 * Cover the target gets against the attacker. The attacker picks its best
 * point (centre or a corner of its own cell), as in the 5e cover rules.
 * `creatures` are occupied cells; a creature in the way gives half cover.
 */
export function coverBetween(m: BattleMap, attacker: Cell, target: Cell, creatures: Cell[] = []): Cover {
  const occupied = new Set(creatures.map((c) => cellKey(...c)));
  const [tx, ty] = geometry(m.grid).center(...target);
  let best: Cover = 'total';
  for (const [ax, ay] of aimPoints(m, attacker)) {
    let cover: Cover = 0;
    for (const c of crossed(m, ax, ay, tx, ty, attacker, target)) {
      const t = terrain(codeAt(m, ...c));
      // Walls and closed doors hide the target completely; pillars and boulders give their listed cover.
      if (blocksSight(m, ...c) && !t.cover) { cover = 'total'; break; }
      const here = t.cover ?? (occupied.has(cellKey(...c)) ? 2 : 0);
      if (here > (cover as number)) cover = here as Cover;
    }
    if (cover === 0) return 0;
    if (best === 'total' || (cover !== 'total' && cover < best)) best = cover;
  }
  return best;
}

// ---------------- light & vision ----------------

export interface Viewer {
  x: number;
  y: number;
  /** Ranges in feet. */
  darkvision?: number;
  blindsight?: number;
  truesight?: number;
  devilsSight?: boolean;
  /** Light the creature carries (torch, Light cantrip…), in feet. */
  light?: { bright: number; dim: number };
}

/** A spell or effect area: magical darkness, or extra light (Daylight). */
export interface Area {
  x: number;
  y: number;
  /** Radius in feet. */
  radius: number;
  kind: 'darkness' | 'light';
  bright?: number;
  dim?: number;
}

/** Per-cell vision state. */
export const UNSEEN = 0, GREY = 1, DIM = 2, BRIGHT = 3;

const index = (m: BattleMap, x: number, y: number) => y * m.width + x;

function inDarknessFn(m: BattleMap, areas: Area[]) {
  const g = geometry(m.grid);
  const dark = areas.filter((a) => a.kind === 'darkness');
  return (c: Cell) => dark.some((a) => g.steps(c, [a.x, a.y]) * FT <= a.radius);
}

/** Clear sight from one cell to another, optionally treating magical darkness as a wall. */
function canSee(m: BattleMap, from: Cell, to: Cell, darkBlocks: ((c: Cell) => boolean) | null): boolean {
  const [ax, ay] = geometry(m.grid).center(...from);
  for (const [bx, by] of aimPoints(m, to)) {
    const path = crossed(m, ax, ay, bx, by, from, to);
    if (path.every((c) => !blocksSight(m, ...c) && !(darkBlocks && darkBlocks(c)))) return true;
  }
  return false;
}

/** Light level per cell: 0 dark, 1 dim, 2 bright. */
export function lightLevels(m: BattleMap, viewers: Viewer[] = [], areas: Area[] = []): Uint8Array {
  const g = geometry(m.grid);
  const base = m.lighting === 'bright' ? 2 : m.lighting === 'dim' ? 1 : 0;
  const out = new Uint8Array(m.width * m.height).fill(base);
  const inDark = inDarknessFn(m, areas);
  const sources: { x: number; y: number; bright: number; dim: number }[] = [];
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const t = terrain(codeAt(m, x, y));
    const p = m.props[cellKey(x, y)];
    if (t.light && p?.lit !== false) sources.push({ x, y, bright: p?.bright ?? t.light.bright, dim: p?.dim ?? t.light.dim });
  }
  viewers.forEach((v) => v.light && sources.push({ x: v.x, y: v.y, ...v.light }));
  areas.filter((a) => a.kind === 'light').forEach((a) => sources.push({ x: a.x, y: a.y, bright: a.bright ?? a.radius, dim: a.dim ?? a.radius }));
  if (base < 2 && sources.length) {
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      let lvl = out[index(m, x, y)];
      for (const s of sources) {
        if (lvl === 2) break;
        const d = g.steps([s.x, s.y], [x, y]) * FT;
        if (d > s.bright + s.dim) continue;
        const want = d <= s.bright ? 2 : 1;
        if (want > lvl && canSee(m, [s.x, s.y], [x, y], null)) lvl = want;
      }
      out[index(m, x, y)] = lvl;
    }
  }
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (inDark([x, y])) out[index(m, x, y)] = 0;
  return out;
}

/**
 * What a group of viewers can see, cell by cell (the best of them wins).
 * Pass one character for per-player vision, or the whole party for shared vision.
 */
export function vision(m: BattleMap, viewers: Viewer[], areas: Area[] = [], light?: Uint8Array): Uint8Array {
  const g = geometry(m.grid);
  const lit = light ?? lightLevels(m, viewers, areas);
  const inDark = inDarknessFn(m, areas);
  const out = new Uint8Array(m.width * m.height);
  for (const v of viewers) {
    const from: Cell = [v.x, v.y];
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const i = index(m, x, y);
      if (out[i] === BRIGHT) continue;
      const d = g.steps(from, [x, y]) * FT;
      const within = (r?: number) => r !== undefined && d <= r;
      const pierces = within(v.blindsight) || within(v.truesight) || (v.devilsSight && d <= 120);
      if (!(x === v.x && y === v.y) && !canSee(m, from, [x, y], pierces ? null : inDark)) continue;
      let state = UNSEEN;
      if (within(v.blindsight) || within(v.truesight)) state = BRIGHT;
      else if (inDark([x, y])) state = v.devilsSight && d <= 120 ? BRIGHT : UNSEEN;
      else if (lit[i] === 2) state = BRIGHT;
      else if (lit[i] === 1) state = within(v.darkvision) ? BRIGHT : DIM;
      else if (within(v.darkvision)) state = GREY;
      if (state > out[i]) out[i] = state;
    }
  }
  return out;
}

export const visibleAt = (m: BattleMap, seen: Uint8Array, x: number, y: number) => inBounds(m, x, y) && seen[index(m, x, y)] > UNSEEN;

// ---------------- pathfinding ----------------

/**
 * Cheapest walk from one cell to another (Dijkstra over movement costs).
 * `blocked` cells (other creatures) can't be ended on but can be passed through,
 * as 5e lets you move through allies. Returns null when there's no way there.
 */
export function findPath(m: BattleMap, from: Cell, to: Cell, blocked: Set<string> = new Set(), opts: { swimSpeed?: boolean } = {}): Cell[] | null {
  if (!passable(m, ...to) || blocked.has(cellKey(...to))) return null;
  if (from[0] === to[0] && from[1] === to[1]) return [from];
  const g = geometry(m.grid);
  const N = m.width * m.height;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const idx = (x: number, y: number) => y * m.width + x;
  const start = idx(...from), goal = idx(...to);
  dist[start] = 0;
  // Small maps (≤ 2400 cells): a simple array-based queue is plenty fast.
  const open: number[] = [start];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    const cx = cur % m.width, cy = Math.floor(cur / m.width);
    for (const [nx, ny] of g.neighbours(cx, cy)) {
      if (!passable(m, nx, ny)) continue;
      const t = terrain(codeAt(m, nx, ny));
      let step = FT * (t.move === 2 && !(t.swim && opts.swimSpeed) ? 2 : 1);
      if (t.code === 'h' && codeAt(m, cx, cy) !== 'h') step += m.props[cellKey(nx, ny)]?.height ?? 10;
      // Prefer straight steps on squares when costs tie, so paths look natural.
      if (m.grid === 'square' && nx !== cx && ny !== cy) step += 0.01;
      const ni = idx(nx, ny);
      if (dist[cur] + step < dist[ni]) {
        if (dist[ni] === Infinity) open.push(ni);
        dist[ni] = dist[cur] + step;
        prev[ni] = cur;
      }
    }
  }
  if (dist[goal] === Infinity) return null;
  const path: Cell[] = [];
  for (let c = goal; c !== -1; c = prev[c]) path.unshift([c % m.width, Math.floor(c / m.width)]);
  return path;
}
