import { BIOMES, generateMap } from './generate';
import { TERRAIN_BY_CODE } from './terrain';
import { fillArea } from './map';

describe('generateMap', () => {
  for (const { biome } of BIOMES) for (const grid of ['square', 'hex'] as const) {
    it(`makes a valid ${grid} ${biome} map`, () => {
      const m = generateMap({ biome, grid, width: 24, height: 16, obstacles: 0.6, hazards: 0.4, lighting: 'bright', seed: 42 });
      expect(m.cells).toHaveLength(16);
      m.cells.forEach((row) => {
        expect(row).toHaveLength(24);
        row.split('').forEach((c) => expect(TERRAIN_BY_CODE[c]).toBeDefined());
      });
      expect(m.grid).toBe(grid);
    });
  }

  it('is the same for the same seed and different for another', () => {
    const o = { biome: 'forest' as const, grid: 'square' as const, width: 20, height: 12, obstacles: 0.5, hazards: 0.2, lighting: 'bright' as const };
    expect(generateMap({ ...o, seed: 7 }).cells).toEqual(generateMap({ ...o, seed: 7 }).cells);
    expect(generateMap({ ...o, seed: 7 }).cells).not.toEqual(generateMap({ ...o, seed: 8 }).cells);
  });

  it('makes caves that are one connected space, and dark', () => {
    const m = generateMap({ biome: 'cave', grid: 'square', width: 30, height: 20, obstacles: 0.5, hazards: 0, lighting: 'bright', seed: 3 });
    expect(m.lighting).toBe('dark');
    const open: [number, number][] = [];
    m.cells.forEach((row, y) => row.split('').forEach((c, x) => c === 's' && open.push([x, y])));
    expect(open.length).toBeGreaterThan(60);
    expect(fillArea(m, open[0]).length).toBe(open.length);
  });
});
