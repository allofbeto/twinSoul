import { CharClass, CharacterClassSummary } from './classTypes';
import { CharacterFeat } from './featTypes';
import { FEATURE_OPTIONS, findOption } from './featureOptions';
import {
  CharacterChoice, choiceActions, choiceSlots, choicesFor, looseChoices, openChoices, unmetPrereqs,
} from './featureChoices';
import { ClassEntry, trackedResources } from './sheetRules';
import { buildSpellSources } from './spellRules';

const makeClass = (index: string, opts: {
  features?: Record<number, string[]>;
  classSpecific?: (level: number) => Record<string, unknown>;
  subclasses?: { index: string; features: Record<number, string[]> }[];
} = {}): CharClass => ({
  id: index, index, name: index[0].toUpperCase() + index.slice(1), hit_die: 8, proficiencies: [], proficiency_choices: [],
  saving_throws: [], starting_equipment: [], starting_equipment_options: [],
  spellcasting_ability: null, spellcasting_info: [], multi_classing: {},
  subclass_choice_level: 3,
  subclasses: (opts.subclasses || []).map((s) => ({
    index: s.index, name: s.index, subclass_flavor: '', desc: [],
    levels: Object.entries(s.features).map(([level, names]) => ({
      level: Number(level), features: names.map((name) => ({ index: name, name, desc: [] })),
    })),
  })),
  levels: Array.from({ length: 20 }, (_, i) => ({
    level: i + 1, ability_score_bonuses: 0, prof_bonus: 2,
    features: (opts.features?.[i + 1] || []).map((name) => ({ index: name, name, desc: [] })),
    spellcasting: null,
    class_specific: opts.classSpecific?.(i + 1) || {},
  })),
});

const fighter = makeClass('fighter', {
  features: { 1: ['Fighting Style', 'Second Wind'] },
  subclasses: [
    { index: 'champion', features: { 10: ['Additional Fighting Style'] } },
    { index: 'battle-master', features: { 3: ['Combat Superiority'] } },
  ],
});
const paladin = makeClass('paladin', { features: { 2: ['Fighting Style'] } });
const warlock = makeClass('warlock', {
  features: { 3: ['Pact Boon'] },
  classSpecific: (l) => ({ invocations_known: l >= 5 ? 3 : l >= 2 ? 2 : 0 }),
});
const sorcerer = makeClass('sorcerer', { classSpecific: (l) => ({ metamagic_known: l >= 3 ? 2 : 0 }) });

const entry = (cls: CharClass, level: number, subclass: string | null = null): ClassEntry => ({
  cls,
  summary: { id: cls.index, level, subclass_index: subclass, char_class_index: cls.index, char_class_name: cls.name, custom_name: null } as CharacterClassSummary,
});

const feat = (index: string): CharacterFeat => ({ index, name: index });
const pick = (group: CharacterChoice['group'], index: string, source: string): CharacterChoice =>
  ({ id: `${source}-${index}`, group, index, name: index, source });

const totals = (entries: ClassEntry[], feats: CharacterFeat[] = []) =>
  Object.fromEntries(choiceSlots(entries, feats).map((s) => [s.key, s.total]));

describe('choiceSlots', () => {
  it('gives a fighting style when the class feature arrives', () => {
    expect(totals([entry(fighter, 1)])).toEqual({ 'class:fighter:fighting-style': 1 });
    expect(totals([entry(paladin, 1)])).toEqual({});
    expect(totals([entry(paladin, 2)])).toEqual({ 'class:paladin:fighting-style': 1 });
  });

  it('counts a second style from a subclass', () => {
    expect(totals([entry(fighter, 9, 'champion')])['class:fighter:fighting-style']).toBe(1);
    expect(totals([entry(fighter, 10, 'champion')])['class:fighter:fighting-style']).toBe(2);
  });

  it('reads invocations and metamagic off the class table, and the pact boon off its feature', () => {
    expect(totals([entry(warlock, 1)])).toEqual({});
    expect(totals([entry(warlock, 2)])).toEqual({ 'class:warlock:invocation': 2 });
    expect(totals([entry(warlock, 5)])).toEqual({ 'class:warlock:pact-boon': 1, 'class:warlock:invocation': 3 });
    expect(totals([entry(sorcerer, 3)])).toEqual({ 'class:sorcerer:metamagic': 2 });
  });

  it('gives battle masters their maneuvers', () => {
    const at = (level: number) => totals([entry(fighter, level, 'battle-master')])['class:fighter:maneuver'];
    expect([2, 3, 7, 10, 15].map(at)).toEqual([undefined, 3, 5, 7, 9]);
  });

  it('keeps each class and feat as its own menu', () => {
    expect(totals([entry(fighter, 1), entry(paladin, 2)], [feat('fighting-initiate'), feat('metamagic-adept')])).toEqual({
      'class:fighter:fighting-style': 1,
      'class:paladin:fighting-style': 1,
      'feat:fighting-initiate:fighting-style': 1,
      'feat:metamagic-adept:metamagic': 2,
    });
  });
});

describe('picks', () => {
  const slots = choiceSlots([entry(warlock, 5)], []);
  const choices = [
    pick('invocation', 'agonizing-blast', 'class:warlock'),
    pick('fighting-style', 'defense', 'class:fighter'), // the fighter levels are gone
    pick('other', 'custom-1', 'other'),
  ];

  it('counts what is still open', () => {
    expect(openChoices(slots, choices)).toBe(3); // 2 invocations + the pact boon
    expect(openChoices(slots, [])).toBe(4);
  });

  it('sorts picks into their menu, and the rest into extras', () => {
    const invocations = slots.find((s) => s.group === 'invocation')!;
    expect(choicesFor(invocations, choices).map((c) => c.index)).toEqual(['agonizing-blast']);
    expect(looseChoices(slots, choices).map((c) => c.index)).toEqual(['defense', 'custom-1']);
  });
});

describe('unmetPrereqs', () => {
  const ctx = { classLevels: { warlock: 5 }, taken: new Set<string>(), spells: new Set<string>() };
  const unmet = (index: string, over = {}) => unmetPrereqs(findOption('invocation', index)!, { ...ctx, ...over });

  it('checks level, pact boon and spells', () => {
    expect(unmet('devils-sight')).toEqual([]);
    expect(unmet('agonizing-blast')).toEqual(['Eldritch Blast']);
    expect(unmet('agonizing-blast', { spells: new Set(['eldritch-blast']) })).toEqual([]);
    expect(unmet('lifedrinker')).toEqual(['Warlock 12', 'Pact of the Blade']);
    expect(unmet('thirsting-blade', { taken: new Set(['pact-of-the-blade']) })).toEqual([]);
  });
});

describe('what picks add to the sheet', () => {
  it('lists the ones you use under Actions', () => {
    const actions = choiceActions([
      pick('maneuver', 'riposte', 'class:fighter'),
      pick('metamagic', 'quickened-spell', 'class:sorcerer'),
      pick('fighting-style', 'archery', 'class:fighter'), // passive
      pick('other', 'custom-1', 'other'),
    ]);
    expect(actions.map((a) => [a.name, a.kind, a.tag])).toEqual([
      ['Riposte', 'reaction', 'Maneuver'],
      ['Quickened Spell', 'bonus', 'Metamagic'],
    ]);
    expect(actions[1].notes).toContain('2 sorcery points');
  });

  it('brings their spells into the Spells tab', () => {
    const sources = buildSpellSources({
      entries: [], feats: [], level: 3, proficiencyBonus: 2,
      scores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 16 },
      choices: [
        pick('invocation', 'armor-of-shadows', 'class:warlock'),
        pick('invocation', 'mask-of-many-faces', 'class:warlock'),
        pick('pact-boon', 'pact-of-the-tome', 'class:warlock'),
      ],
    });
    const granted = sources.find((s) => s.key === 'options')!;
    expect(granted.granted.map((g) => g.name)).toEqual(['Mage Armor', 'Disguise Self']);
    expect(granted.saveDc).toBe(13);
    expect(sources.find((s) => s.key === 'option:pact-of-the-tome')!.cantrips).toBe(3);
    expect(sources[sources.length - 1].key).toBe('other');
  });

  it('tracks superiority dice for battle masters', () => {
    const scores = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
    const dice = (level: number, sub: string) =>
      trackedResources([entry(fighter, level, sub)], scores, {}).find((r) => r.key === 'fighter:superiority_dice');
    expect(dice(3, 'champion')).toBeUndefined();
    expect(dice(3, 'battle-master')).toMatchObject({ label: 'Superiority Dice (d8)', total: 4, recharge: 'short' });
    expect(dice(15, 'battle-master')).toMatchObject({ label: 'Superiority Dice (d10)', total: 6 });
  });
});

describe('catalog', () => {
  it('has no duplicate options, and every pact requirement exists', () => {
    const keys = FEATURE_OPTIONS.map((o) => `${o.group}:${o.index}`);
    expect(new Set(keys).size).toBe(keys.length);
    FEATURE_OPTIONS.filter((o) => o.needs).forEach((o) => expect(findOption('pact-boon', o.needs!)).toBeDefined());
  });
});
