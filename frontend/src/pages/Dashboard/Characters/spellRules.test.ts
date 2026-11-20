import { CharClass, CharacterClassSummary } from './classTypes';
import { ClassEntry, SlotLevel } from './sheetRules';
import { buildSpellSources, canChoose, choicesLeft, freeSlotFor, sourceUsage } from './spellRules';
import { castTiming } from './spellTypes';

type SC = Record<string, number>;

const makeClass = (index: string, ability: string | null, at: (l: number) => SC | null): CharClass => ({
  id: index, index, name: index[0].toUpperCase() + index.slice(1), hit_die: 8, proficiencies: [], proficiency_choices: [],
  saving_throws: [], starting_equipment: [], starting_equipment_options: [], spellcasting_ability: ability,
  spellcasting_info: [], multi_classing: {}, subclasses: [], subclass_choice_level: 1,
  levels: Array.from({ length: 20 }, (_, i) => ({
    level: i + 1, ability_score_bonuses: 0, prof_bonus: 2, features: [], class_specific: {},
    spellcasting: at(i + 1),
  })),
});

const fullSlots = (l: number): SC => ({ spell_slots_level_1: 2, ...(l >= 3 ? { spell_slots_level_2: 2 } : {}), ...(l >= 5 ? { spell_slots_level_3: 2 } : {}), ...(l === 20 ? { spell_slots_level_9: 1 } : {}) });
const wizard = makeClass('wizard', 'int', (l) => ({ cantrips_known: l >= 4 ? 4 : 3, ...fullSlots(l) }));
const cleric = makeClass('cleric', 'wis', (l) => ({ cantrips_known: 3, ...fullSlots(l) }));
const warlock = makeClass('warlock', 'cha', (l) => ({ cantrips_known: 2, spells_known: l + 1, [`spell_slots_level_${Math.min(5, Math.ceil(l / 2))}`]: 2 }));
const fighter = makeClass('fighter', null, () => null);

const entry = (cls: CharClass, level: number, subclass: string | null = null): ClassEntry => ({
  cls,
  summary: { id: cls.index, level, subclass_index: subclass, char_class_index: cls.index, char_class_name: cls.name, custom_name: null } as CharacterClassSummary,
});

const scores = { strength: 10, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 14, charisma: 16 };
const base = { feats: [], scores, proficiencyBonus: 2 };
const spell = (index: string, level: number, classes: string[], extra: Partial<{ school: string; ritual: boolean; attack_type: string }> = {}) =>
  ({ index, level, class_indexes: classes, school: extra.school || 'Evocation', ritual: !!extra.ritual, attack_type: extra.attack_type || null });

describe('class spell sources', () => {
  it('gives a wizard a spellbook and INT + level prepared spells', () => {
    const [wiz] = buildSpellSources({ ...base, entries: [entry(wizard, 3)], level: 3 });
    expect(wiz).toMatchObject({ key: 'class:wizard', mode: 'spellbook', cantrips: 3, spells: 10, prepares: 6, maxLevel: 2, saveDc: 13, attack: 5 });
  });

  it('lets a cleric prepare from the list and grants domain spells by level', () => {
    const [clr] = buildSpellSources({ ...base, entries: [entry(cleric, 3, 'life')], level: 3 });
    expect(clr).toMatchObject({ mode: 'prepared', prepares: 5, spells: 0, label: 'Cleric · Life Domain' });
    expect(clr.granted.map((g) => g.index)).toEqual(['bless', 'cure-wounds', 'lesser-restoration', 'spiritual-weapon']);
  });

  it('adds a warlock patron’s expanded spells to the options, up to the slot level', () => {
    const [wl] = buildSpellSources({ ...base, entries: [entry(warlock, 3, 'fiend')], level: 3 });
    expect(wl).toMatchObject({ mode: 'known', spells: 4, maxLevel: 2 });
    expect(wl.extraIndexes).toEqual(expect.arrayContaining(['burning-hands', 'scorching-ray']));
    expect(wl.extraIndexes).not.toContain('fireball');
    expect(canChoose(wl, spell('scorching-ray', 2, ['sorcerer', 'wizard']))).toBe(true);
    expect(canChoose(wl, spell('shatter', 2, ['sorcerer', 'wizard']))).toBe(false);
    expect(canChoose(wl, spell('shatter', 2, ['sorcerer', 'wizard']), true)).toBe(true); // any list
  });

  it('turns an Eldritch Knight into a wizard-list third caster from level 3', () => {
    expect(buildSpellSources({ ...base, entries: [entry(fighter, 2, 'eldritch-knight')], level: 2 })).toHaveLength(1); // just "other"
    const [ek] = buildSpellSources({ ...base, entries: [entry(fighter, 7, 'eldritch-knight')], level: 7 });
    expect(ek).toMatchObject({ lists: ['wizard'], cantrips: 2, spells: 5, maxLevel: 2, ability: 'intelligence' });
  });
});

describe('race and feat spells', () => {
  it('grants tiefling spells as the character levels', () => {
    const at = (level: number) => buildSpellSources({ ...base, entries: [], raceIndex: 'tiefling', level })
      .find((s) => s.key === 'race')!.granted.map((g) => g.index);
    expect(at(1)).toEqual(['thaumaturgy']);
    expect(at(5)).toEqual(['thaumaturgy', 'hellish-rebuke', 'darkness']);
  });

  it('lets a high elf pick one wizard cantrip', () => {
    const race = buildSpellSources({ ...base, entries: [], raceIndex: 'elf', subraceIndex: 'high-elf', level: 1 }).find((s) => s.key === 'race')!;
    expect(canChoose(race, spell('fire-bolt', 0, ['wizard']))).toBe(true);
    expect(canChoose(race, spell('sacred-flame', 0, ['cleric']))).toBe(false);
    expect(canChoose(race, spell('magic-missile', 1, ['wizard']))).toBe(false);
  });

  it('limits feat picks by level, school and ritual', () => {
    const sources = buildSpellSources({
      ...base, entries: [], level: 4,
      feats: [{ index: 'fey-touched', name: 'Fey Touched', ability: 'cha' }, { index: 'ritual-caster', name: 'Ritual Caster' }],
    });
    const fey = sources.find((s) => s.key === 'feat:fey-touched')!;
    expect(fey.granted.map((g) => g.index)).toEqual(['misty-step']);
    expect(canChoose(fey, spell('command', 1, ['cleric'], { school: 'Enchantment' }))).toBe(true);
    expect(canChoose(fey, spell('magic-missile', 1, ['wizard']))).toBe(false);
    const ritual = sources.find((s) => s.key === 'feat:ritual-caster')!;
    expect(canChoose(ritual, spell('find-familiar', 1, ['wizard'], { ritual: true }))).toBe(true);
    expect(canChoose(ritual, spell('shield', 1, ['wizard']))).toBe(false);
  });
});

describe('counting and limits', () => {
  it('counts choices per source and honours table overrides', () => {
    const [wiz] = buildSpellSources({ ...base, entries: [entry(wizard, 1)], level: 1, overrides: { 'spells:class:wizard:cantrips': 5 } });
    const chosen = [
      { index: 'fire-bolt', name: 'Fire Bolt', level: 0, source: 'class:wizard' },
      { index: 'shield', name: 'Shield', level: 1, source: 'class:wizard', prepared: true },
      { index: 'sleep', name: 'Sleep', level: 1, source: 'class:wizard' },
      { index: 'light', name: 'Light', level: 0, source: 'race' },
    ];
    const used = sourceUsage(wiz, chosen);
    expect(used).toEqual({ cantrips: 1, spells: 2, prepared: 1 });
    expect(wiz.cantrips).toBe(5);
    expect(choicesLeft(wiz, used)).toBe(4 + 4); // 4 cantrips + 4 more spellbook spells
  });

  it('casts with the lowest free slot that is high enough', () => {
    const slots: SlotLevel[] = [
      { key: '1', label: '1st', total: 2, autoTotal: 2, used: 2, slotLevel: 1 },
      { key: '2', label: '2nd', total: 2, autoTotal: 2, used: 0, slotLevel: 2 },
      { key: 'pact', label: 'Pact (3rd)', total: 2, autoTotal: 2, used: 0, slotLevel: 3 },
    ];
    expect(freeSlotFor(slots, 1)?.key).toBe('2');
    expect(freeSlotFor(slots, 3)?.key).toBe('pact');
    expect(freeSlotFor(slots, 4)).toBeUndefined();
  });

  it('reads casting times into turn timing', () => {
    expect(castTiming('1 bonus action')).toBe('bonus');
    expect(castTiming('1 reaction, which you take when…')).toBe('reaction');
    expect(castTiming('1 action')).toBe('action');
    expect(castTiming('10 minutes')).toBe('other');
  });
});
