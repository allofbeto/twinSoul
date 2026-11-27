// Battle map data and the editing operations the builder uses. All operations
// are pure: they return a new map and never mutate the one passed in.

import { cellKey, geometry, type Cell, type GridType } from './grid';
import type { CellProps, TerrainCode } from './terrain';

export type Lighting = 'bright' | 'dim' | 'dark';

export interface BattleMapSettings {
  /** 5e optional rule: every second diagonal costs 10 ft (square maps only). */
  diagonals?: '5' | '5-10-5';
  /** Shared party vision (default) or each player sees only their own characters' view. */
  vision?: 'party' | 'player';
  /** Set on generated maps, so "Reroll" can make another of the same kind. */
  quick?: { biome: string; obstacles: number; hazards: number };
  /** Set on maps the dungeon helper made, so "Another one" can reroll from the same answers. */
  recipe?: Record<string, unknown>;
}

export interface BattleMap {
  id?: string;
  campaign_id?: string;
  session_id?: string | null;
  name: string;
  grid: GridType;
  width: number;
  height: number;
  /** One string per row, one terrain code per cell. */
  cells: string[];
  props: Record<string, CellProps>;
  lighting: Lighting;
  settings: BattleMapSettings;
  template?: boolean;
  updated_at?: string;
}

export const MIN_SIZE = 5;
export const MAX_WIDTH = 60;
export const MAX_HEIGHT = 40;

export function blankMap(name: string, grid: GridType, width: number, height: number, fill: TerrainCode = 'g'): BattleMap {
  return { name, grid, width, height, cells: Array.from({ length: height }, () => fill.repeat(width)), props: {}, lighting: 'bright', settings: {} };
}

export const inBounds = (m: Pick<BattleMap, 'width' | 'height'>, x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;

export const codeAt = (m: BattleMap, x: number, y: number) => (inBounds(m, x, y) ? m.cells[y][x] : '#');

/** Paint a set of cells. Props on cells whose terrain changes are dropped. */
export function paint(m: BattleMap, cells: Cell[], code: TerrainCode): BattleMap {
  const rows = m.cells.map((r) => r.split(''));
  const props = { ...m.props };
  let changed = false;
  for (const [x, y] of cells) {
    if (!inBounds(m, x, y) || rows[y][x] === code) continue;
    rows[y][x] = code;
    delete props[cellKey(x, y)];
    changed = true;
  }
  return changed ? { ...m, cells: rows.map((r) => r.join('')), props } : m;
}

/** Cells covered by a brush of the given size (1 = just the cell). */
export function brush(m: BattleMap, [x, y]: Cell, size: number): Cell[] {
  if (size <= 1) return [[x, y]];
  const g = geometry(m.grid);
  const out: Cell[] = [];
  for (let yy = y - size; yy <= y + size; yy++) for (let xx = x - size; xx <= x + size; xx++) {
    if (inBounds(m, xx, yy) && g.steps([x, y], [xx, yy]) < size) out.push([xx, yy]);
  }
  return out;
}

/** Flood fill: every connected cell with the same terrain as the start. */
export function fillArea(m: BattleMap, start: Cell): Cell[] {
  if (!inBounds(m, ...start)) return [];
  const g = geometry(m.grid);
  const target = codeAt(m, ...start);
  const seen = new Set([cellKey(...start)]);
  const queue: Cell[] = [start];
  const out: Cell[] = [];
  while (queue.length) {
    const c = queue.shift()!;
    out.push(c);
    for (const n of g.neighbours(...c)) {
      // On squares, fill through edges only — diagonal leaks would cross walls.
      if (m.grid === 'square' && n[0] !== c[0] && n[1] !== c[1]) continue;
      const k = cellKey(...n);
      if (!seen.has(k) && inBounds(m, ...n) && codeAt(m, ...n) === target) { seen.add(k); queue.push(n); }
    }
  }
  return out;
}

/** Cells along a straight line between two cells (for walls and rivers). */
export function line(m: BattleMap, a: Cell, b: Cell): Cell[] {
  const g = geometry(m.grid);
  const n = Math.max(1, g.steps(a, b));
  const [ax, ay] = g.center(...a), [bx, by] = g.center(...b);
  const out: Cell[] = [];
  const seen = new Set<string>();
  for (let i = 0; i <= n; i++) {
    const c = g.cellAt(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
    const k = cellKey(...c);
    if (!seen.has(k) && inBounds(m, ...c)) { seen.add(k); out.push(c); }
  }
  return out;
}

/** Rectangle between two corner cells (inclusive). */
export function rect(a: Cell, b: Cell): { x0: number; y0: number; x1: number; y1: number } {
  return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) };
}

/**
 * Room tool: floor inside, walls around the edge. Existing doors on the edge are
 * kept, and walls of a neighbouring room are reused rather than doubled.
 */
export function room(m: BattleMap, a: Cell, b: Cell, floor: TerrainCode = '.'): BattleMap {
  const { x0, y0, x1, y1 } = rect(a, b);
  const walls: Cell[] = [];
  const inside: Cell[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inBounds(m, x, y)) continue;
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    if (edge) { if (codeAt(m, x, y) !== 'D') walls.push([x, y]); } else inside.push([x, y]);
  }
  return paint(paint(m, walls, '#'), inside, floor);
}

export function setProps(m: BattleMap, [x, y]: Cell, patch: Partial<CellProps> | null): BattleMap {
  const key = cellKey(x, y);
  const props = { ...m.props };
  if (patch === null) delete props[key];
  else {
    const next = { ...props[key], ...patch };
    Object.keys(next).forEach((k) => (next as Record<string, unknown>)[k] === undefined && delete (next as Record<string, unknown>)[k]);
    if (Object.keys(next).length) props[key] = next; else delete props[key];
  }
  return { ...m, props };
}

/** Grow or shrink the map, keeping the top-left corner where it is. */
export function resize(m: BattleMap, width: number, height: number, fill: TerrainCode = 'g'): BattleMap {
  const w = Math.max(MIN_SIZE, Math.min(MAX_WIDTH, Math.round(width)));
  const h = Math.max(MIN_SIZE, Math.min(MAX_HEIGHT, Math.round(height)));
  const cells = Array.from({ length: h }, (_, y) => (m.cells[y] ?? '').slice(0, w).padEnd(w, fill));
  const props = Object.fromEntries(Object.entries(m.props).filter(([k]) => {
    const [x, y] = k.split(',').map(Number);
    return x < w && y < h;
  }));
  return { ...m, width: w, height: h, cells, props };
}
