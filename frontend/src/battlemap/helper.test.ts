import { nextQuestion, readAnswers, summarize, surprise } from './helper';
import { generateFromRecipe } from './generate';
import { TERRAIN_BY_CODE } from './terrain';

describe('dungeon helper', () => {
  it('reads a whole scene from one sentence', () => {
    const a = readAnswers('A night ambush on the road — the cart is burning and there is a pit', 'biome');
    expect(a).toMatchObject({ biome: 'road', lighting: 'dark' });
    expect(a.hazards).toEqual(expect.arrayContaining(['fire', 'pit']));
  });

  it('understands how many rooms', () => {
    expect(readAnswers('add 3 rooms', null)).toMatchObject({ rooms: 3, structure: 'rooms' });
    expect(readAnswers('a couple of small rooms', null)).toMatchObject({ rooms: 2 });
    expect(readAnswers('several chambers please', null)).toMatchObject({ rooms: 5 });
    expect(summarize({ biome: 'tavern', structure: 'rooms', rooms: 3 })).toBe('tavern / inside · 3 rooms');
  });

  it('understands short answers in context', () => {
    expect(readAnswers('nope', 'hazards')).toEqual({ hazards: [] });
    expect(readAnswers('none', 'structure')).toEqual({ structure: 'none' });
    expect(readAnswers('some', 'cover')).toEqual({ cover: 'some' });
    expect(readAnswers('a swampy forest at dusk, hex please', null)).toMatchObject({ biome: 'forest', hazards: ['mud'], lighting: 'dim', grid: 'hex' });
  });

  it('asks only what is still missing, and skips buildings indoors', () => {
    expect(nextQuestion({})).toBe('biome');
    expect(nextQuestion({ biome: 'forest' })).toBe('structure');
    expect(nextQuestion({ biome: 'cave' })).toBe('hazards');
    expect(nextQuestion({ biome: 'road', structure: 'none', hazards: [], cover: 'some', lighting: 'dark' })).toBe('size');
    expect(nextQuestion({ biome: 'road', structure: 'none', hazards: [], cover: 'some', lighting: 'dark', size: 'M' })).toBeNull();
  });

  it('repeats back what it understood', () => {
    expect(summarize({ biome: 'road', hazards: ['fire', 'pit'], lighting: 'dark' })).toBe('road · fire, pits · night / dark');
  });

  it('fills the gaps when asked to surprise', () => {
    let s = 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const full = surprise({ biome: 'cave' }, r);
    expect(full).toMatchObject({ biome: 'cave', structure: 'none', lighting: 'dark', size: 'M' });
    expect(nextQuestion(full)).toBeNull();
  });
});

describe('generateFromRecipe', () => {
  const base = { grid: 'square' as const, width: 24, height: 16, seed: 5, lighting: 'bright' as const };
  const count = (cells: string[], code: string) => cells.join('').split(code).length - 1;

  it('adds the hazards and structures that were asked for', () => {
    const m = generateFromRecipe({ ...base, biome: 'forest', structure: 'hut', hazards: ['pit', 'fire', 'water', 'trap', 'high'], cover: 'some' });
    expect(count(m.cells, 'o')).toBeGreaterThan(0);
    expect(count(m.cells, 'f')).toBeGreaterThan(0);
    expect(count(m.cells, 'W')).toBeGreaterThan(0);
    expect(count(m.cells, '^')).toBeGreaterThan(0);
    expect(count(m.cells, 'h')).toBeGreaterThan(0);
    expect(count(m.cells, '#')).toBeGreaterThan(10);
    expect(count(m.cells, 'D')).toBeGreaterThan(0);
  });

  it('keeps a clean map clean, and every cell valid', () => {
    for (const biome of ['forest', 'road', 'river', 'cave', 'tavern', 'ruins'] as const) {
      const m = generateFromRecipe({ ...base, biome, structure: 'none', hazards: [], cover: 'open' });
      expect(count(m.cells, 'o') + count(m.cells, '^')).toBe(0);
      m.cells.forEach((row) => row.split('').forEach((c) => expect(TERRAIN_BY_CODE[c]).toBeDefined()));
    }
  });

  it('builds the number of rooms asked for, in a tavern or outdoors', () => {
    const doors = (cells: string[]) => count(cells, 'D');
    const one = generateFromRecipe({ ...base, biome: 'tavern', structure: 'rooms', rooms: 1, hazards: [], cover: 'some' });
    const four = generateFromRecipe({ ...base, biome: 'tavern', structure: 'rooms', rooms: 4, hazards: [], cover: 'some' });
    expect(doors(four.cells) - doors(one.cells)).toBe(3); // one inner door per extra room
    const outside = generateFromRecipe({ ...base, biome: 'forest', structure: 'rooms', rooms: 3, hazards: [], cover: 'open' });
    expect(doors(outside.cells)).toBeGreaterThanOrEqual(4); // 2 inner + 2 outer
  });

  it('lights dark interiors', () => {
    const m = generateFromRecipe({ ...base, biome: 'cave', hazards: [], cover: 'some', lighting: 'dark' });
    expect(count(m.cells, 'l')).toBeGreaterThan(0);
  });
});
