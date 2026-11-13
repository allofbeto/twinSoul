// Rules helpers and flavour for the D&D 5e character builder. Flavour text
// is twinSoul's own; the numbers are standard 5e character-creation rules.
import { CharClass } from '../classTypes';
import { CharRace } from '../raceTypes';
import { DND_SKILLS } from '../constants';

export type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
export type Scores = Record<AbilityKey, number>;

export const ABILITY_KEYS: AbilityKey[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

export const ABILITY_META: Record<AbilityKey, { short: string; name: string; hint: string }> = {
  strength: { short: 'STR', name: 'Strength', hint: 'Raw power: hitting hard, lifting, climbing.' },
  dexterity: { short: 'DEX', name: 'Dexterity', hint: 'Agility and aim: dodging, sneaking, archery.' },
  constitution: { short: 'CON', name: 'Constitution', hint: 'Toughness: more hit points, holding on.' },
  intelligence: { short: 'INT', name: 'Intelligence', hint: 'Reason and memory: arcane magic, lore.' },
  wisdom: { short: 'WIS', name: 'Wisdom', hint: 'Awareness and will: divine magic, insight.' },
  charisma: { short: 'CHA', name: 'Charisma', hint: 'Force of personality: persuasion, innate magic.' },
};

const SHORT_TO_KEY: Record<string, AbilityKey> = {
  str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma',
};
export const abilityKeyFromShort = (code: string): AbilityKey | undefined => SHORT_TO_KEY[code.toLowerCase()];

export const modifier = (score: number) => Math.floor((score - 10) / 2);
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export const blankScores = (value = 10): Scores =>
  ABILITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: value }), {} as Scores);

// ---------------------------------------------------------------- methods

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const POINT_BUY_BUDGET = 27;
const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const pointCost = (score: number) => POINT_COST[score] ?? 0;
export const pointsSpent = (scores: Scores) => ABILITY_KEYS.reduce((sum, k) => sum + pointCost(scores[k]), 0);

const d6 = () => 1 + Math.floor(Math.random() * 6);
// 4d6, drop the lowest. Returns the dice too so the UI can show them.
export const rollAbility = () => {
  const dice = [d6(), d6(), d6(), d6()];
  const lowest = Math.min(...dice);
  const dropAt = dice.indexOf(lowest);
  const total = dice.reduce((s, d, i) => (i === dropAt ? s : s + d), 0);
  return { dice, dropAt, total };
};

// ---------------------------------------------------------------- classes

interface ClassFlavor {
  icon: string;
  tagline: string;
  primary: AbilityKey[]; // most important first
}

export const CLASS_FLAVOR: Record<string, ClassFlavor> = {
  barbarian: { icon: '🪓', tagline: 'A storm of fury that shrugs off wounds.', primary: ['strength', 'constitution'] },
  bard: { icon: '🎻', tagline: 'Weaves magic from music, wit and stories.', primary: ['charisma', 'dexterity'] },
  cleric: { icon: '☀️', tagline: 'Channels the power of a god to heal and smite.', primary: ['wisdom', 'constitution'] },
  druid: { icon: '🌿', tagline: 'Speaks for the wild and takes its shapes.', primary: ['wisdom', 'constitution'] },
  fighter: { icon: '⚔️', tagline: 'A master of weapons, armour and battle.', primary: ['strength', 'constitution'] },
  monk: { icon: '👊', tagline: 'Turns inner focus into blinding speed.', primary: ['dexterity', 'wisdom'] },
  paladin: { icon: '🛡️', tagline: 'A holy warrior bound by a sacred oath.', primary: ['strength', 'charisma'] },
  ranger: { icon: '🏹', tagline: 'Hunter and tracker at the edge of the map.', primary: ['dexterity', 'wisdom'] },
  rogue: { icon: '🗡️', tagline: 'Strikes from the shadows with precision.', primary: ['dexterity', 'intelligence'] },
  sorcerer: { icon: '🔥', tagline: 'Born with raw magic burning in the blood.', primary: ['charisma', 'constitution'] },
  warlock: { icon: '👁️', tagline: 'Wields power granted by an otherworldly patron.', primary: ['charisma', 'constitution'] },
  wizard: { icon: '📜', tagline: 'Bends reality through study and spellbooks.', primary: ['intelligence', 'constitution'] },
  artificer: { icon: '⚙️', tagline: 'Invents magic through tools and infused gear.', primary: ['intelligence', 'constitution'] },
  'blood-hunter': { icon: '🩸', tagline: 'Hunts monsters with forbidden blood magic.', primary: ['dexterity', 'intelligence'] },
};

export const classFlavor = (cls: CharClass): ClassFlavor => {
  const known = CLASS_FLAVOR[cls.index];
  if (known) return known;
  const casting = cls.spellcasting_ability ? abilityKeyFromShort(cls.spellcasting_ability) : undefined;
  return {
    icon: cls.homebrew ? '🧪' : '✨',
    tagline: cls.description?.split(/(?<=\.)\s/)[0] || 'A path of your own making.',
    primary: casting ? [casting, 'constitution'] : ['strength', 'constitution'],
  };
};

// Standard-array scores laid out for a class: best two go to its key
// abilities, then Constitution, then the rest in a sensible order.
export const suggestedArray = (
  cls: CharClass | undefined,
  pool: number[] = STANDARD_ARRAY,
  primary: AbilityKey[] = cls ? classFlavor(cls).primary : [],
): Scores => {
  const sorted = [...pool].sort((a, b) => b - a);
  const order: AbilityKey[] = [];
  const push = (k: AbilityKey) => { if (!order.includes(k)) order.push(k); };
  primary.forEach(push);
  ['constitution', 'dexterity', 'wisdom', 'strength', 'charisma', 'intelligence'].forEach((k) => push(k as AbilityKey));
  return order.reduce((acc, k, i) => ({ ...acc, [k]: sorted[i] }), {} as Scores);
};

// Skills a class may choose from, and how many. Homebrew classes without
// structured choices get two picks from the full list.
export const classSkillChoice = (cls: CharClass | undefined): { choose: number; from: string[] } => {
  const all = DND_SKILLS.map((s) => s.name);
  if (!cls) return { choose: 2, from: all };
  for (const choice of (cls.proficiency_choices || []) as any[]) {
    const options = choice?.from?.options || [];
    const skills = options
      .map((o: any) => o?.item?.index as string | undefined)
      .filter((idx: string | undefined) => idx?.startsWith('skill-'))
      .map((idx: string) => all.find((name) => `skill-${name.toLowerCase().replace(/\s+/g, '-')}` === idx))
      .filter(Boolean) as string[];
    if (skills.length > 0) return { choose: choice.choose || 2, from: skills };
  }
  return { choose: 2, from: all };
};

// Hit points: full hit die at 1st level, then the fixed average per level.
export const startingHp = (cls: CharClass | undefined, level: number, conMod: number) => {
  const die = cls?.hit_die || 8;
  const first = die + conMod;
  const perLevel = Math.floor(die / 2) + 1 + conMod;
  return Math.max(1, first + Math.max(0, level - 1) * Math.max(1, perLevel));
};

// ---------------------------------------------------------------- races

// Races where the player picks some bonuses themselves.
export type BonusChoice = { amounts: number[]; exclude: AbilityKey[]; note: string } | null;

export const raceBonusChoice = (race: CharRace | undefined): BonusChoice => {
  if (!race) return null;
  if (race.index === 'half-elf') {
    return { amounts: [1, 1], exclude: ['charisma'], note: 'Half-elves raise two other abilities by 1.' };
  }
  const trait = race.traits.find((t) => t.index === 'ability-score-increase');
  const text = trait?.desc.join(' ') || '';
  if (/by 2 and a different one by 1/i.test(text)) {
    return { amounts: [2, 1], exclude: [], note: `${race.name}: choose where your +2 and +1 go.` };
  }
  if (/one other ability score/i.test(text)) {
    const fixed = race.ability_bonuses.map((b) => abilityKeyFromShort(b.ability_score)).filter(Boolean) as AbilityKey[];
    return { amounts: [1], exclude: fixed, note: `${race.name}: choose one more ability to raise by 1.` };
  }
  return null;
};


// ---------------------------------------------------------------- names

const NAME_PARTS: Record<string, [string[], string[]]> = {
  elvish: [['Ae', 'Ela', 'Thal', 'Syl', 'Lia', 'Eri', 'Fae', 'Ilya', 'Nae', 'Va'], ['riel', 'nor', 'wyn', 'thas', 'lith', 'drel', 'sera', 'mir', 'vyre', 'ndis']],
  dwarvish: [['Bru', 'Dur', 'Thor', 'Gim', 'Har', 'Kil', 'Bal', 'Ror', 'Dag', 'Tor'], ['dek', 'grim', 'in', 'nar', 'rak', 'vik', 'dun', 'gar', 'mund', 'ra']],
  small: [['Pip', 'Ros', 'Fen', 'Tibb', 'Lo', 'Wil', 'Mer', 'Bim', 'Nim', 'Cor'], ['pin', 'wick', 'by', 'kin', 'ble', 'do', 'ry', 'fern', 'nock', 'sy']],
  fierce: [['Gro', 'Ur', 'Kra', 'Zug', 'Mok', 'Tha', 'Dra', 'Vor', 'Grak', 'Shar'], ['nak', 'gash', 'thar', 'rok', 'mar', 'zul', 'gor', 'esh', 'dak', 'ka']],
  draconic: [['Ari', 'Bala', 'Kriv', 'Med', 'Nadar', 'Pand', 'Sora', 'Tor', 'Vrak', 'Zor'], ['jhan', 'sar', 'inn', 'rash', 'ix', 'thra', 'mys', 'jurn', 'esh', 'aar']],
  infernal: [['Ak', 'Dam', 'Ekem', 'Kai', 'Lev', 'Mor', 'Nem', 'Ske', 'Zar', 'Bry'], ['menos', 'akos', 'ira', 'sus', 'thos', 'eia', 'oris', 'kai', 'eth', 'ion']],
  common: [['Al', 'Bren', 'Cor', 'Da', 'Ed', 'Is', 'Jor', 'Mar', 'Ro', 'Sel'], ['ric', 'wen', 'an', 'na', 'mund', 'ra', 'den', 'issa', 'land', 'ine']],
};

const RACE_NAME_STYLE: Record<string, string> = {
  elf: 'elvish', 'half-elf': 'elvish', eladrin: 'elvish', fairy: 'elvish', firbolg: 'elvish', satyr: 'elvish', owlin: 'elvish', aasimar: 'elvish',
  dwarf: 'dwarvish', goliath: 'dwarvish', gnome: 'small', halfling: 'small', harengon: 'small', kobold: 'small', goblin: 'small',
  'half-orc': 'fierce', orc: 'fierce', bugbear: 'fierce', hobgoblin: 'fierce', minotaur: 'fierce', leonin: 'fierce',
  dragonborn: 'draconic', lizardfolk: 'draconic', 'yuan-ti-pureblood': 'draconic', tiefling: 'infernal', gith: 'infernal',
};

const EPITHETS = ['the Bold', 'Stormborn', 'of the Ashen Vale', 'the Wanderer', 'Oathkeeper', 'the Unbroken', 'Nightwhisper', 'of the Silver Road', 'Emberheart', 'the Quiet Blade'];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export const suggestName = (raceIndex?: string) => {
  const [starts, ends] = NAME_PARTS[RACE_NAME_STYLE[raceIndex || ''] || 'common'];
  const name = pick(starts) + pick(ends);
  return Math.random() < 0.35 ? `${name} ${pick(EPITHETS)}` : name;
};

// ---------------------------------------------------------------- multiclass

export interface ClassPick {
  index: string;
  level: number;
  subclassIndex: string;
}

export const totalLevel = (picks: ClassPick[]) => picks.reduce((sum, p) => sum + p.level, 0);

// Hit points across classes: the starting class gives its full hit die at
// 1st level; every other level uses that class's fixed average.
export const multiclassHp = (picks: { cls?: CharClass; level: number }[], conMod: number) => {
  if (picks.length === 0) return startingHp(undefined, 1, conMod);
  let hp = 0;
  picks.forEach((p, i) => {
    const die = p.cls?.hit_die || 8;
    const avg = Math.max(1, Math.floor(die / 2) + 1 + conMod);
    hp += i === 0 ? die + conMod + (p.level - 1) * avg : p.level * avg;
  });
  return Math.max(1, hp);
};

interface Requirement {
  label: string;
  met: (scores: Scores) => boolean;
}

// Ability scores a class needs before you can multiclass into or out of it
// (from the class data, e.g. "STR 13 or DEX 13").
export const multiclassRequirement = (cls: CharClass): Requirement | null => {
  const mc = (cls.multi_classing || {}) as any;
  const toReq = (p: any) => ({ key: abilityKeyFromShort(p?.ability_score?.index || ''), min: Number(p?.minimum_score) || 13 });
  const all = ((mc.prerequisites || []) as any[]).map(toReq).filter((r) => r.key) as { key: AbilityKey; min: number }[];
  const any = ((mc.prerequisite_options?.from?.options || []) as any[]).map(toReq).filter((r) => r.key) as { key: AbilityKey; min: number }[];
  if (all.length && any.length) {
    // e.g. Blood Hunter: "STR 13 or DEX 13, and INT 13"
    return {
      label: `${any.map((r) => `${ABILITY_META[r.key].short} ${r.min}`).join(' or ')}, and ${all.map((r) => `${ABILITY_META[r.key].short} ${r.min}`).join(' and ')}`,
      met: (s) => all.every((r) => s[r.key] >= r.min) && any.some((r) => s[r.key] >= r.min),
    };
  }
  if (all.length) {
    return {
      label: all.map((r) => `${ABILITY_META[r.key].short} ${r.min}`).join(' and '),
      met: (s) => all.every((r) => s[r.key] >= r.min),
    };
  }
  if (any.length) {
    return {
      label: any.map((r) => `${ABILITY_META[r.key].short} ${r.min}`).join(' or '),
      met: (s) => any.some((r) => s[r.key] >= r.min),
    };
  }
  return null;
};

// Key abilities across all chosen classes, starting class first.
export const combinedPrimary = (classes: CharClass[]): AbilityKey[] => {
  const out: AbilityKey[] = [];
  const firsts = classes.map((c) => classFlavor(c).primary[0]);
  const rest = classes.flatMap((c) => classFlavor(c).primary.slice(1));
  [...firsts, ...rest].forEach((k) => { if (!out.includes(k)) out.push(k); });
  return out;
};

// ---------------------------------------------------------------- ASI / feats

// One Ability Score Improvement the character has earned, and what they did with it.
export interface AsiChoice {
  key: string; // `${classIndex}-${classLevel}`
  classIndex: string;
  className: string;
  classLevel: number;
  kind: 'plus2' | 'split' | 'feat' | null;
  first: AbilityKey | null; // +2 target, or first +1
  second: AbilityKey | null; // second +1
  featIndex: string | null;
  featAbility: AbilityKey | null; // the feat's +1, when it offers one
}

export const blankAsi = (classIndex: string, className: string, classLevel: number): AsiChoice => ({
  key: `${classIndex}-${classLevel}`,
  classIndex,
  className,
  classLevel,
  kind: null,
  first: null,
  second: null,
  featIndex: null,
  featAbility: null,
});

export const asiIsComplete = (a: AsiChoice) =>
  (a.kind === 'plus2' && !!a.first) ||
  (a.kind === 'split' && !!a.first && !!a.second && a.first !== a.second) ||
  (a.kind === 'feat' && !!a.featIndex);

// Ability increases from all completed choices.
export const asiBonuses = (choices: AsiChoice[]): Partial<Record<AbilityKey, number>> => {
  const out: Partial<Record<AbilityKey, number>> = {};
  const add = (k: AbilityKey | null, n: number) => { if (k) out[k] = (out[k] || 0) + n; };
  choices.forEach((a) => {
    if (a.kind === 'plus2') add(a.first, 2);
    if (a.kind === 'split') { add(a.first, 1); add(a.second, 1); }
    if (a.kind === 'feat') add(a.featAbility, 1);
  });
  return out;
};
