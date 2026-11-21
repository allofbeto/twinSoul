import { CR_OPTIONS, guideFor, midHp, scoresFor } from './crDefaults';

describe('guideFor', () => {
  it('has a row for every challenge rating', () => {
    CR_OPTIONS.forEach((cr) => expect(guideFor(cr)).not.toBeNull());
    expect(guideFor('99')).toBeNull();
  });

  it('matches the usual numbers', () => {
    expect(guideFor('1/2')).toMatchObject({ prof: 2, ac: 13, hp: [50, 70], attack: 3, dc: 13 });
    expect(guideFor('5')).toMatchObject({ prof: 3, ac: 15, attack: 6 });
    expect(midHp(guideFor('5')!)).toBe(138);
  });

  it('only ever goes up with CR', () => {
    const hp = CR_OPTIONS.map((cr) => guideFor(cr)!.hp[0]);
    expect(hp).toEqual([...hp].sort((a, b) => a - b));
  });
});

describe('scoresFor', () => {
  it('raises the role’s main ability with CR, capped at 20', () => {
    expect(scoresFor('brute', '1/2').strength).toBe(13);
    expect(scoresFor('brute', '5').strength).toBe(16);
    expect(scoresFor('brute', '30').strength).toBe(20);
  });

  it('leaves the rest average, and lifts the role\u2019s second ability', () => {
    const s = scoresFor('caster', '9');
    expect(s.intelligence).toBe(17);
    expect(s.strength).toBe(10);
    expect(s.constitution).toBe(14);
  });
});
