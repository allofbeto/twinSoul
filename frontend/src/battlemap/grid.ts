// Grid geometry for square and pointy-top hex maps (odd rows shifted right).
// Everything is in "cell units" for logic and pixels for drawing.

export type GridType = 'square' | 'hex';
export type Cell = [number, number];

/** Pixel width of one cell when drawn at zoom 1. */
export const CELL_PX = 32;
const SQRT3 = Math.sqrt(3);
/** Hex radius (centre to corner) for a hex CELL_PX wide. */
export const HEX_R = CELL_PX / SQRT3;

export interface Geometry {
  grid: GridType;
  /** Centre of a cell, in px. */
  center: (x: number, y: number) => [number, number];
  /** Total drawing size for a width × height map, in px. */
  size: (width: number, height: number) => [number, number];
  /** Which cell a pixel falls in (may be off the map). */
  cellAt: (px: number, py: number) => Cell;
  /** Steps between two cells (5e default: diagonals count as 1 on squares). */
  steps: (a: Cell, b: Cell) => number;
  neighbours: (x: number, y: number) => Cell[];
  /** Polygon points for drawing a cell outline, centred on (cx, cy). */
  outline: (cx: number, cy: number, inset?: number) => string;
}

const square: Geometry = {
  grid: 'square',
  center: (x, y) => [x * CELL_PX + CELL_PX / 2, y * CELL_PX + CELL_PX / 2],
  size: (w, h) => [w * CELL_PX, h * CELL_PX],
  cellAt: (px, py) => [Math.floor(px / CELL_PX), Math.floor(py / CELL_PX)],
  steps: (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])),
  neighbours: (x, y) => [
    [x - 1, y - 1], [x, y - 1], [x + 1, y - 1], [x - 1, y], [x + 1, y], [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
  ],
  outline: (cx, cy, inset = 0) => {
    const h = CELL_PX / 2 - inset;
    return `${cx - h},${cy - h} ${cx + h},${cy - h} ${cx + h},${cy + h} ${cx - h},${cy + h}`;
  },
};

// Offset (odd-r) ↔ cube coordinates.
const toCube = ([x, y]: Cell): [number, number, number] => {
  const q = x - (y - (y & 1)) / 2;
  return [q, y, -q - y];
};
const fromAxial = (q: number, r: number): Cell => [q + (r - (r & 1)) / 2, r];
function cubeRound(q: number, r: number): Cell {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return fromAxial(rq, rr);
}

const hex: Geometry = {
  grid: 'hex',
  center: (x, y) => [x * CELL_PX + CELL_PX / 2 + (y & 1 ? CELL_PX / 2 : 0), y * HEX_R * 1.5 + HEX_R],
  size: (w, h) => [w * CELL_PX + CELL_PX / 2, (h - 1) * HEX_R * 1.5 + 2 * HEX_R],
  cellAt: (px, py) => {
    // Relative to the centre of cell (0, 0).
    const x = px - CELL_PX / 2, y = py - HEX_R;
    const q = ((SQRT3 / 3) * x - y / 3) / HEX_R;
    const r = ((2 / 3) * y) / HEX_R;
    return cubeRound(q, r);
  },
  steps: (a, b) => {
    const A = toCube(a), B = toCube(b);
    return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
  },
  neighbours: (x, y) => {
    const odd = y & 1;
    return [
      [x - 1, y], [x + 1, y],
      [x - 1 + odd, y - 1], [x + odd, y - 1],
      [x - 1 + odd, y + 1], [x + odd, y + 1],
    ];
  },
  outline: (cx, cy, inset = 0) => {
    const r = HEX_R - inset;
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(' ');
  },
};

export const geometry = (grid: GridType): Geometry => (grid === 'hex' ? hex : square);

export const cellKey = (x: number, y: number) => `${x},${y}`;
export const parseKey = (k: string): Cell => k.split(',').map(Number) as Cell;
