// Dropping creatures onto a map: nearest free, walkable square to an anchor.

import { cellKey, geometry, type Cell } from './grid';
import type { BattleMap } from './map';
import { passable } from './rules';
import { terrain } from './terrain';
import { codeAt } from './map';

/** A free square near `anchor`: walkable, not a hazard, not taken. Searches outward. */
export function nearestFree(m: BattleMap, anchor: Cell, taken: Set<string>): Cell | null {
  const g = geometry(m.grid);
  const seen = new Set([cellKey(...anchor)]);
  const queue: Cell[] = [anchor];
  while (queue.length) {
    const c = queue.shift()!;
    const [x, y] = c;
    if (x >= 0 && y >= 0 && x < m.width && y < m.height && passable(m, x, y) && !terrain(codeAt(m, x, y)).hazard && !taken.has(cellKey(x, y))) return c;
    for (const n of g.neighbours(x, y)) {
      const k = cellKey(...n);
      if (!seen.has(k) && n[0] >= -1 && n[1] >= -1 && n[0] <= m.width && n[1] <= m.height) { seen.add(k); queue.push(n); }
    }
  }
  return null;
}

/**
 * Positions for creatures that aren't on the map yet: allies gather on the
 * left, enemies on the right, each side packed around its anchor.
 */
export function autoPlace(
  m: BattleMap,
  creatures: { id: string; enemy: boolean; pos?: Cell | null }[],
): Record<string, Cell> {
  const taken = new Set(creatures.filter((c) => c.pos).map((c) => cellKey(...(c.pos as Cell))));
  const out: Record<string, Cell> = {};
  const mid = Math.floor(m.height / 2);
  const anchors = { ally: [Math.max(1, Math.floor(m.width * 0.2)), mid] as Cell, enemy: [Math.min(m.width - 2, Math.floor(m.width * 0.8)), mid] as Cell };
  for (const c of creatures) {
    if (c.pos) continue;
    const spot = nearestFree(m, c.enemy ? anchors.enemy : anchors.ally, taken);
    if (!spot) continue;
    out[c.id] = spot;
    taken.add(cellKey(...spot));
  }
  return out;
}
