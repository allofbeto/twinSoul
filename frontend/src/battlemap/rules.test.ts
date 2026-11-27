import { blankMap, paint, room, setProps, type BattleMap } from './map';
import { BRIGHT, DIM, GREY, UNSEEN, coverBetween, lightLevels, moveCost, passable, vision } from './rules';
import { geometry, type Cell } from './grid';

const at = (m: BattleMap, seen: Uint8Array, x: number, y: number) => seen[y * m.width + x];

describe('movement', () => {
  it('counts 5 ft a step and doubles difficult terrain', () => {
    let m = blankMap('t', 'square', 10, 5);
    m = paint(m, [[2, 0], [3, 0]], ',');
    const r = moveCost(m, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
    expect(r).toMatchObject({ feet: 30, difficult: 2, blockedAt: null });
  });

  it('stops at walls and locked doors, but not closed ones', () => {
    let m = blankMap('t', 'square', 6, 5);
    m = paint(m, [[2, 0]], '#');
    expect(moveCost(m, [[0, 0], [1, 0], [2, 0]]).blockedAt).toBe(2);
    m = paint(m, [[2, 0]], 'D');
    expect(passable(m, 2, 0)).toBe(true);
    m = setProps(m, [2, 0], { state: 'locked' });
    expect(passable(m, 2, 0)).toBe(false);
  });

  it('lets swimmers through deep water at normal speed', () => {
    const m = paint(blankMap('t', 'square', 6, 5), [[1, 0], [2, 0]], 'W');
    expect(moveCost(m, [[0, 0], [1, 0], [2, 0]]).feet).toBe(20);
    expect(moveCost(m, [[0, 0], [1, 0], [2, 0]], { swimSpeed: true }).feet).toBe(10);
  });

  it('uses 5-10-5 diagonals only when the map asks for it', () => {
    const m = blankMap('t', 'square', 6, 6);
    const diag: Cell[] = [[0, 0], [1, 1], [2, 2], [3, 3]];
    expect(moveCost(m, diag).feet).toBe(15);
    expect(moveCost({ ...m, settings: { diagonals: '5-10-5' } }, diag).feet).toBe(20);
  });

  it('reports hazards on the way and the cost of climbing', () => {
    let m = paint(blankMap('t', 'square', 6, 5), [[1, 0]], 'o');
    m = paint(m, [[2, 0]], 'h');
    const r = moveCost(m, [[0, 0], [1, 0], [2, 0]]);
    expect(r.hazards).toEqual([{ cell: [1, 0], kind: 'pit' }]);
    expect(r.feet).toBe(5 + 5 + 10);
  });

  it('works on hex grids', () => {
    const m = blankMap('t', 'hex', 8, 6);
    const g = geometry('hex');
    expect(g.steps([0, 0], [3, 0])).toBe(3);
    expect(g.neighbours(2, 1)).toHaveLength(6);
    expect(moveCost(m, [[0, 0], [1, 0], [2, 0]]).feet).toBe(10);
    // cellAt is the inverse of center
    for (const c of [[0, 0], [3, 2], [5, 5]] as Cell[]) expect(g.cellAt(...g.center(...c))).toEqual(c);
  });
});

describe('cover', () => {
  it('gives half cover behind a crate and three-quarters behind a pillar', () => {
    let m = blankMap('t', 'square', 9, 3);
    expect(coverBetween(m, [0, 1], [6, 1])).toBe(0);
    m = paint(m, [[5, 1]], 'c');
    expect(coverBetween(m, [0, 1], [6, 1])).toBe(2);
    m = paint(m, [[5, 1]], 'P');
    expect(coverBetween(m, [0, 1], [6, 1])).toBe(5);
  });

  it('is total behind a wall, and a creature in the way gives half cover', () => {
    let m = blankMap('t', 'square', 9, 5);
    m = paint(m, [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4]], '#');
    expect(coverBetween(m, [0, 2], [7, 2])).toBe('total');
    const open = blankMap('t', 'square', 9, 3);
    expect(coverBetween(open, [0, 1], [6, 1], [[3, 1]])).toBe(2);
  });
});

describe('light and vision', () => {
  it('lights cells around a torch and stops at walls', () => {
    let m: BattleMap = { ...blankMap('t', 'square', 20, 5, 's'), lighting: 'dark' };
    m = paint(m, [[2, 2]], 'l');
    const lit = lightLevels(m);
    expect(lit[2 * 20 + 3]).toBe(2); // 5 ft away: bright
    expect(lit[2 * 20 + 7]).toBe(1); // 25 ft: dim
    expect(lit[2 * 20 + 12]).toBe(0); // 50 ft: dark
    const walled = paint(m, [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]], '#');
    expect(lightLevels(walled)[2 * 20 + 6]).toBe(0);
  });

  it('sees lit cells, uses darkvision in the dark, and nothing through walls', () => {
    let m: BattleMap = { ...blankMap('t', 'square', 20, 5, 's'), lighting: 'dark' };
    const human = vision(m, [{ x: 0, y: 2 }]);
    expect(at(m, human, 5, 2)).toBe(UNSEEN);
    const dwarf = vision(m, [{ x: 0, y: 2, darkvision: 60 }]);
    expect(at(m, dwarf, 5, 2)).toBe(GREY);
    expect(at(m, dwarf, 13, 2)).toBe(UNSEEN); // 65 ft
    m = { ...m, lighting: 'dim' };
    expect(at(m, vision(m, [{ x: 0, y: 2 }]), 5, 2)).toBe(DIM);
    expect(at(m, vision(m, [{ x: 0, y: 2, darkvision: 60 }]), 5, 2)).toBe(BRIGHT);
    const walled = room({ ...blankMap('t', 'square', 20, 9, 's') }, [8, 0], [14, 8], 's');
    const v = vision(walled, [{ x: 2, y: 4 }]);
    expect(at(walled, v, 8, 4)).toBe(BRIGHT); // the wall face itself
    expect(at(walled, v, 11, 4)).toBe(UNSEEN); // inside the room
  });

  it('opening a door lets sight through', () => {
    let m = room(blankMap('t', 'square', 20, 9, 's'), [8, 0], [14, 8], 's');
    m = paint(m, [[8, 4]], 'D');
    expect(at(m, vision(m, [{ x: 2, y: 4 }]), 11, 4)).toBe(UNSEEN);
    m = setProps(m, [8, 4], { state: 'open' });
    expect(at(m, vision(m, [{ x: 2, y: 4 }]), 11, 4)).toBe(BRIGHT);
  });

  it('magical darkness hides what is inside and behind it, except from Devil\'s Sight', () => {
    const m = blankMap('t', 'square', 20, 5, 's');
    const darkness = [{ x: 8, y: 2, radius: 10, kind: 'darkness' as const }];
    const v = vision(m, [{ x: 0, y: 2, darkvision: 60 }], darkness);
    expect(at(m, v, 8, 2)).toBe(UNSEEN);
    expect(at(m, v, 14, 2)).toBe(UNSEEN); // behind it
    expect(at(m, v, 3, 2)).toBe(BRIGHT);
    const warlock = vision(m, [{ x: 0, y: 2, devilsSight: true }], darkness);
    expect(at(m, warlock, 8, 2)).toBe(BRIGHT);
  });

  it('shared party vision is the best of each member', () => {
    const m = { ...blankMap('t', 'square', 20, 5, 's'), lighting: 'dark' as const };
    const party = vision(m, [{ x: 0, y: 2, light: { bright: 20, dim: 20 } }, { x: 19, y: 2, darkvision: 30 }]);
    expect(at(m, party, 2, 2)).toBe(BRIGHT); // torch
    expect(at(m, party, 17, 2)).toBe(GREY); // darkvision
    expect(at(m, party, 10, 2)).toBe(UNSEEN); // neither
  });
});
