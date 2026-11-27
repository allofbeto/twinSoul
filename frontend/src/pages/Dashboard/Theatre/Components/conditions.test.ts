import { effectAgainst, emptyDefenses, parseDefenseEntry, parseDefenseText } from './conditions';

describe('parseDefenseEntry', () => {
  it('reads a plain damage type', () => {
    expect(parseDefenseEntry('fire')).toEqual({ types: ['fire'], note: undefined, label: 'fire' });
  });

  it('reads the qualified physical resistances in the bestiary', () => {
    const e = parseDefenseEntry('bludgeoning, piercing, and slashing from nonmagical weapons');
    expect(e.types).toEqual(['bludgeoning', 'piercing', 'slashing']);
    expect(e.note).toBe('nonmagical weapons');
    expect(e.label).toBe('physical (nonmagical weapons)');
  });

  it('keeps the exception when there is one', () => {
    const e = parseDefenseEntry("bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered");
    expect(e.note).toContain("aren't silvered");
  });

  it('keeps text it cannot place', () => {
    expect(parseDefenseEntry('damage from spells')).toMatchObject({ types: [], label: 'damage from spells' });
  });

  it('reads a single type with a note', () => {
    const e = parseDefenseEntry('piercing from magic weapons wielded by good creatures');
    expect(e.types).toEqual(['piercing']);
    expect(e.note).toBe('magic weapons wielded by good creatures');
  });
});

describe('parseDefenseText', () => {
  it('sorts an NPC’s written defenses', () => {
    const { defenses, leftover } = parseDefenseText('Resistant to fire and cold; immune to poison, charmed; vulnerable to radiant; wears a ring of warmth');
    expect(defenses.resist[0].types).toEqual(['cold', 'fire']);
    expect(defenses.immune[0].types).toEqual(['poison']);
    expect(defenses.conditionImmune).toEqual(['Charmed']);
    expect(defenses.vulnerable[0].types).toEqual(['radiant']);
    expect(leftover).toBe('wears a ring of warmth');
  });

  it('copes with nothing', () => {
    expect(parseDefenseText('').defenses).toEqual(emptyDefenses());
    expect(parseDefenseText(null).leftover).toBe('');
  });
});

describe('effectAgainst', () => {
  const d = {
    ...emptyDefenses(),
    resist: [parseDefenseEntry('cold'), parseDefenseEntry('bludgeoning, piercing, and slashing from nonmagical weapons')],
    immune: [parseDefenseEntry('fire')],
    vulnerable: [parseDefenseEntry('radiant')],
  };

  it('finds how a creature fares against a type', () => {
    expect(effectAgainst(d, 'fire')?.kind).toBe('immune');
    expect(effectAgainst(d, 'cold')?.kind).toBe('resist');
    expect(effectAgainst(d, 'radiant')?.kind).toBe('vulnerable');
    expect(effectAgainst(d, 'slashing')).toEqual({ kind: 'resist', note: 'nonmagical weapons' });
    expect(effectAgainst(d, 'acid')).toBeNull();
  });

  it('has nothing to say without a type or defenses', () => {
    expect(effectAgainst(d, null)).toBeNull();
    expect(effectAgainst(undefined, 'fire')).toBeNull();
  });

  it('lets immunity beat resistance', () => {
    const both = { ...emptyDefenses(), resist: [parseDefenseEntry('fire')], immune: [parseDefenseEntry('fire')] };
    expect(effectAgainst(both, 'fire')?.kind).toBe('immune');
  });
});
