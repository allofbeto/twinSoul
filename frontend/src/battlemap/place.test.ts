import { autoPlace, nearestFree } from './place';
import { blankMap, paint, room } from './map';
import { findPath, moveCost } from './rules';
import { geometry } from './grid';

describe('placing creatures', () => {
  it('puts allies left and enemies right, never on walls, hazards or each other', () => {
    let m = blankMap('t', 'square', 20, 10);
    m = paint(m, [[4, 5], [16, 5]], '#');
    m = paint(m, [[4, 4]], 'o');
    const spots = autoPlace(m, [
      { id: 'a', enemy: false }, { id: 'b', enemy: false }, { id: 'e1', enemy: true }, { id: 'e2', enemy: true }, { id: 'set', enemy: true, pos: [10, 5] },
    ]);
    expect(Object.keys(spots).sort()).toEqual(['a', 'b', 'e1', 'e2']);
    const keys = new Set(Object.values(spots).map(([x, y]) => `${x},${y}`));
    expect(keys.size).toBe(4);
    expect(spots.a[0]).toBeLessThan(10);
    expect(spots.e1[0]).toBeGreaterThan(10);
    for (const [x, y] of Object.values(spots)) expect(m.cells[y][x]).toBe('g');
  });

  it('finds a free square even when the anchor is inside a wall block', () => {
    const m = room(blankMap('t', 'square', 12, 12), [0, 0], [11, 11], 's');
    expect(nearestFree(m, [0, 0], new Set())).toEqual([1, 1]);
  });
});

describe('findPath', () => {
  it('walks around walls and prefers cheap ground', () => {
    let m = blankMap('t', 'square', 10, 5);
    m = paint(m, [[5, 0], [5, 1], [5, 2], [5, 3]], '#');
    const p = findPath(m, [0, 0], [9, 0])!;
    expect(p[0]).toEqual([0, 0]);
    expect(p[p.length - 1]).toEqual([9, 0]);
    expect(p.some(([x, y]) => x === 5 && y === 4)).toBe(true);
    expect(moveCost(m, p).blockedAt).toBeNull();
  });

  it('avoids difficult terrain when going around is cheaper', () => {
    let m = blankMap('t', 'square', 7, 3);
    m = paint(m, [[3, 1]], ',');
    const p = findPath(m, [0, 1], [6, 1])!;
    expect(moveCost(m, p).feet).toBe(30);
  });

  it('returns null for unreachable or occupied targets', () => {
    let m = blankMap('t', 'square', 6, 3);
    m = paint(m, [[3, 0], [3, 1], [3, 2]], '#');
    expect(findPath(m, [0, 1], [5, 1])).toBeNull();
    expect(findPath(blankMap('t', 'square', 6, 3), [0, 1], [4, 1], new Set(['4,1']))).toBeNull();
  });

  it('works on hex', () => {
    const m = blankMap('t', 'hex', 8, 6);
    const p = findPath(m, [0, 0], [5, 3])!;
    expect(p.length - 1).toBe(geometry('hex').steps([0, 0], [5, 3]));
  });
});
