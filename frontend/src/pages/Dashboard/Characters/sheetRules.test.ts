import { CharClass, CharacterClassSummary } from './classTypes';
import {
  ClassEntry, isSaveProficient, restCustomTrackers, setOverride, applyDamage, applyHealing, hitDicePools, initiativeBonus, longRestChanges, savingThrowProficiencies,
  shortRestChanges, skillBonus, spellSlotLevels, trackedResources,
} from './sheetRules';

// Minimal class with a spell slot table: slotsAt(level) -> [1st, 2nd, ...].
const makeClass = (index: string, hitDie: number, opts: {
  saves?: string[];
  slotsAt?: (level: number) => number[];
  classSpecific?: (level: number) => Record<string, unknown>;
} = {}): CharClass => ({
  id: index, index, name: index, hit_die: hitDie, proficiencies: [], proficiency_choices: [],
  saving_throws: opts.saves || [], starting_equipment: [], starting_equipment_options: [],
  spellcasting_ability: opts.slotsAt ? 'int' : null, spellcasting_info: [], multi_classing: {},
  subclasses: [], subclass_choice_level: 3,
  levels: Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const slots = opts.slotsAt?.(level);
    return {
      level, ability_score_bonuses: 0, prof_bonus: 2, features: [],
      spellcasting: slots ? Object.fromEntries(slots.map((n, j) => [`spell_slots_level_${j + 1}`, n])) : null,
      class_specific: opts.classSpecific?.(level) || {},
    };
  }),
});

const full = (l: number) => (l >= 20 ? [4, 3, 3, 3, 3, 2, 2, 1, 1] : l >= 5 ? [4, 3, 2] : l >= 3 ? [4, 2] : [l + 1]);
const half = (l: number) => (l >= 20 ? [4, 3, 3, 3, 2] : l >= 5 ? [4, 2] : l >= 2 ? [2] : [0]);
const pact = (l: number) => (l >= 20 ? [0, 0, 0, 0, 4] : l >= 5 ? [0, 0, 2] : [l >= 2 ? 2 : 1]);

const wizard = makeClass('wizard', 6, { saves: ['int', 'wis'], slotsAt: full });
const paladin = makeClass('paladin', 10, { saves: ['wis', 'cha'], slotsAt: half });
const warlock = makeClass('warlock', 8, { saves: ['wis', 'cha'], slotsAt: pact });
const fighter = makeClass('fighter', 10, {
  saves: ['str', 'con'],
  classSpecific: (l) => ({ action_surges: l >= 17 ? 2 : l >= 2 ? 1 : 0, indomitable_uses: l >= 9 ? 1 : 0 }),
});

const entry = (cls: CharClass, level: number, subclass: string | null = null): ClassEntry => ({
  cls,
  summary: { id: cls.index, level, subclass_index: subclass, char_class_index: cls.index, char_class_name: cls.name, custom_name: null } as CharacterClassSummary,
});

const scores = { strength: 10, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 10, charisma: 8 };

describe('spell slots', () => {
  it('uses the class table for a single caster', () => {
    expect(spellSlotLevels([entry(wizard, 5)], {}).map((s) => s.total)).toEqual([4, 3, 2]);
  });

  it('combines casters with the multiclass table (paladin counts half, rounded down)', () => {
    // Wizard 3 + Paladin 5 = caster level 3 + 2 = 5 → 4/3/2
    expect(spellSlotLevels([entry(wizard, 3), entry(paladin, 5)], {}).map((s) => s.total)).toEqual([4, 3, 2]);
  });

  it('keeps warlock pact slots separate', () => {
    const slots = spellSlotLevels([entry(wizard, 1), entry(warlock, 5)], { pact: 1, 1: 5 });
    expect(slots.find((s) => s.key === '1')).toMatchObject({ total: 2, used: 2 }); // used is capped
    expect(slots.find((s) => s.key === 'pact')).toMatchObject({ total: 2, used: 1, slotLevel: 3 });
  });

  it('gives an Eldritch Knight third-caster slots', () => {
    expect(spellSlotLevels([entry(fighter, 7, 'eldritch-knight')], {}).map((s) => s.total)).toEqual([4, 2]);
  });
});

describe('saves, skills, initiative', () => {
  it('takes saving throws from the starting class only, plus Resilient', () => {
    const saves = savingThrowProficiencies([entry(fighter, 1), entry(wizard, 1)], [{ index: 'resilient', name: 'Resilient', ability: 'dex' }]);
    expect(Array.from(saves).sort()).toEqual(['constitution', 'dexterity', 'strength']);
  });

  it('doubles proficiency for expertise and halves it for Jack of All Trades', () => {
    expect(skillBonus('Stealth', scores, ['Stealth'], ['Stealth'], 3, false)).toBe(2 + 6);
    expect(skillBonus('Arcana', scores, [], [], 3, true)).toBe(3 + 1);
  });

  it('adds Alert to initiative', () => {
    expect(initiativeBonus(scores, [{ index: 'alert', name: 'Alert' }], 2, false)).toBe(7);
  });
});

describe('hit points and rests', () => {
  it('takes damage from temporary HP first', () => {
    expect(applyDamage({ current_hp: 20, temp_hp: 5 }, 8)).toEqual({ temp_hp: 0, current_hp: 17 });
    expect(applyDamage({ current_hp: 3, temp_hp: 0 }, 10)).toEqual({ temp_hp: 0, current_hp: 0 });
  });

  it('caps healing at max HP and clears death saves', () => {
    expect(applyHealing({ current_hp: 0, max_hp: 10 }, 25)).toMatchObject({ current_hp: 10, death_save_failures: 0 });
  });

  it('regains half the hit dice on a long rest, biggest dice first', () => {
    const pools = hitDicePools([entry(fighter, 3), entry(wizard, 2)], { d10: 3, d6: 2 });
    const changes = longRestChanges({
      current_hp: 4, max_hp: 30, temp_hp: 2, death_save_successes: 1, death_save_failures: 2,
      hit_dice_used: { d10: 3, d6: 2 }, spell_slots_used: { 1: 2 }, resources_used: { 'fighter:action_surges': 1 },
    }, pools);
    // 5 dice total → 2 back, both d10s.
    expect(changes.hit_dice_used).toEqual({ d10: 1, d6: 2 });
    expect(changes).toMatchObject({ current_hp: 30, temp_hp: 0, spell_slots_used: {}, resources_used: {} });
  });

  it('restores pact slots and short-rest resources on a short rest', () => {
    const resources = trackedResources([entry(fighter, 9)], scores, {});
    const changes = shortRestChanges({
      current_hp: 1, max_hp: 10, temp_hp: 0, death_save_successes: 0, death_save_failures: 0, hit_dice_used: {},
      spell_slots_used: { 1: 1, pact: 2 },
      resources_used: { 'fighter:action_surges': 1, 'fighter:indomitable_uses': 1 },
    }, resources);
    expect(changes.spell_slots_used).toEqual({ 1: 1 });
    expect(changes.resources_used).toEqual({ 'fighter:indomitable_uses': 1 });
  });
});

describe('table overrides', () => {
  it('lets the table change slot counts and add slot levels', () => {
    const slots = spellSlotLevels([entry(wizard, 3)], {}, { 'slots:1': 6, 'slots:4': 1 });
    expect(slots.map((s) => [s.key, s.total, s.autoTotal])).toEqual([['1', 6, 4], ['2', 2, 2], ['4', 1, 0]]);
  });

  it('overrides resource and hit dice maximums', () => {
    const [surge] = trackedResources([entry(fighter, 2)], scores, {}, { 'resource:fighter:action_surges': 3 });
    expect(surge).toMatchObject({ total: 3, autoTotal: 1 });
    expect(hitDicePools([entry(fighter, 3)], {}, { 'hitdice:d10': 5 })[0]).toMatchObject({ total: 5, autoTotal: 3 });
  });

  it('can grant or remove a save proficiency by hand', () => {
    const auto = savingThrowProficiencies([entry(fighter, 1)], []);
    expect(isSaveProficient('wisdom', auto, { 'saveprof:wisdom': 1 })).toBe(true);
    expect(isSaveProficient('strength', auto, { 'saveprof:strength': 0 })).toBe(false);
    expect(isSaveProficient('strength', auto, {})).toBe(true);
  });

  it('drops an override that matches the calculation', () => {
    expect(setOverride({ initiative: 5 }, 'initiative', 2, 2)).toEqual({});
    expect(setOverride({}, 'initiative', 7, 2)).toEqual({ initiative: 7 });
  });

  it('resets table trackers on the right rests', () => {
    const trackers = [
      { id: 'a', label: 'Luck', total: 3, used: 2, recharge: 'long' as const },
      { id: 'b', label: 'Grit', total: 2, used: 1, recharge: 'short' as const },
      { id: 'c', label: 'Wish', total: 1, used: 1, recharge: 'none' as const },
    ];
    expect(restCustomTrackers(trackers, 'short').map((t) => t.used)).toEqual([2, 0, 1]);
    expect(restCustomTrackers(trackers, 'long').map((t) => t.used)).toEqual([0, 0, 1]);
  });
});
