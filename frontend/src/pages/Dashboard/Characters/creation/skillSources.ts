// Where a hero's skills come from: race, background, starting class and any
// multiclass. Some sources grant skills outright; others let the player choose.
import { CharClass } from '../classTypes';
import { CharRace, Subrace } from '../raceTypes';
import { DND_SKILLS } from '../constants';
import { Background } from './backgrounds';
import { classSkillChoice } from './builderData';
import { ALL_LANGUAGES, CLASS_LANGUAGES, countLanguageChoices } from '../languages';

export const ALL_SKILLS = DND_SKILLS.map((s) => s.name);

export interface GrantedSkill {
  skill: string;
  source: string;
}

export interface SkillPool {
  key: string;
  source: string; // shown as the section heading, e.g. "Rogue (multiclass)"
  choose: number;
  from: string[];
  note?: string;
}

type RaceSkills = { grant?: string[]; choose?: number; from?: string[] };

// Published races carry only twinSoul's short summaries, so their skill grants
// are listed here rather than read from the text. Keys are race or subrace indexes.
const RACE_SKILLS: Record<string, RaceSkills> = {
  elf: { grant: ['Perception'] },
  'half-elf': { choose: 2 },
  'half-orc': { grant: ['Intimidation'] },
  bugbear: { grant: ['Stealth'] },
  centaur: { choose: 1, from: ['Animal Handling', 'Medicine', 'Nature', 'Survival'] },
  changeling: { choose: 2, from: ['Deception', 'Insight', 'Intimidation', 'Persuasion'] },
  goliath: { grant: ['Athletics'] },
  grung: { grant: ['Perception'] },
  kenku: { choose: 2, from: ['Acrobatics', 'Deception', 'Stealth', 'Sleight of Hand'] },
  leonin: { choose: 1, from: ['Athletics', 'Intimidation', 'Perception', 'Survival'] },
  lizardfolk: { choose: 2, from: ['Animal Handling', 'Nature', 'Perception', 'Stealth', 'Survival'] },
  locathah: { grant: ['Athletics', 'Perception'] },
  minotaur: { choose: 1, from: ['Intimidation', 'Persuasion'] },
  satyr: { grant: ['Performance', 'Persuasion'] },
  tabaxi: { grant: ['Perception', 'Stealth'] },
  tortle: { grant: ['Survival'] },
  vedalken: { choose: 1, from: ['Arcana', 'History', 'Investigation', 'Medicine', 'Performance', 'Sleight of Hand'] },
  verdan: { grant: ['Persuasion'] },
  warforged: { choose: 1 },
  harengon: { grant: ['Perception'] },
  owlin: { grant: ['Stealth'] },
  githyanki: { choose: 1 },
  beasthide: { grant: ['Athletics'] },
  longtooth: { grant: ['Intimidation'] },
  swiftstride: { grant: ['Acrobatics'] },
  wildhunt: { grant: ['Survival'] },
};

const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4 };

// Homebrew races describe their skills in prose: "proficiency in the Perception skill",
// "two skills of your choice", "one of the following skills: Arcana, History".
export const parseTraitSkills = (texts: string[]): RaceSkills[] => {
  const grant: string[] = [];
  const choices: RaceSkills[] = [];
  texts.forEach((raw) => {
    const text = raw.replace(/\s+/g, ' ');
    if (/considered proficient/i.test(text)) return;
    const following = text.match(/\b(a|an|one|two|three|four) of the following skills?:?\s*([^.]+)/i);
    if (following) {
      const from = ALL_SKILLS.filter((s) => following[2].toLowerCase().includes(s.toLowerCase()));
      if (from.length) choices.push({ choose: NUMBERS[following[1].toLowerCase()], from });
      return;
    }
    const anyChoice = text.match(/\b(a|an|one|two|three|four) (?:additional )?skills?\b[^.]*\b(?:of your choice|you choose)/i);
    if (anyChoice && /proficien/i.test(text)) {
      choices.push({ choose: NUMBERS[anyChoice[1].toLowerCase()] });
      return;
    }
    if (/proficien(?:t|cy) (?:in|with)/i.test(text)) {
      grant.push(...ALL_SKILLS.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(text)));
    }
  });
  return [{ grant }, ...choices];
};

const raceSkills = (race: CharRace, subrace?: Subrace): RaceSkills[] => {
  if (race.homebrew) {
    return parseTraitSkills([
      ...race.traits.flatMap((t) => t.desc),
      ...(subrace?.racial_traits || []).flatMap((t) => t.desc),
    ]);
  }
  return [RACE_SKILLS[race.index], subrace && RACE_SKILLS[subrace.index]].filter(Boolean) as RaceSkills[];
};

// Skills a class offers when it is taken as a multiclass (Bard, Ranger, Rogue).
export const multiclassSkillChoice = (cls: CharClass): { choose: number; from: string[] } | null => {
  for (const choice of (cls.multi_classing?.proficiency_choices || []) as any[]) {
    const from = ((choice?.from?.options || []) as any[])
      .map((o) => o?.item?.index as string | undefined)
      .filter((idx): idx is string => !!idx?.startsWith('skill-'))
      .map((idx) => ALL_SKILLS.find((s) => `skill-${s.toLowerCase().replace(/\s+/g, '-')}` === idx))
      .filter(Boolean) as string[];
    if (from.length) return { choose: choice.choose || 1, from };
  }
  return null;
};

interface Sources {
  race?: CharRace;
  subrace?: Subrace;
  background?: Background;
  classes: CharClass[]; // starting class first
}

export const buildSkillSources = ({ race, subrace, background, classes }: Sources) => {
  const granted: GrantedSkill[] = [];
  const pools: SkillPool[] = [];
  let overlaps = 0;

  const grant = (skill: string, source: string) => {
    if (granted.some((g) => g.skill === skill)) overlaps += 1;
    else granted.push({ skill, source });
  };

  const raceName = subrace?.name || race?.name || 'Race';
  if (race) {
    raceSkills(race, subrace).forEach((rs, i) => {
      rs.grant?.forEach((s) => grant(s, raceName));
      if (rs.choose) pools.push({ key: `race-${i}`, source: raceName, choose: rs.choose, from: rs.from?.length ? rs.from : ALL_SKILLS });
    });
  }

  if (background) {
    background.skills.forEach((s) => grant(s, background.name));
    if (background.skillChoice) {
      const { choose, from } = background.skillChoice;
      pools.push({ key: 'background', source: `${background.name} background`, choose, from: from === 'any' ? ALL_SKILLS : from });
    }
  }

  const [starting, ...others] = classes;
  if (starting) {
    const choice = classSkillChoice(starting);
    pools.unshift({ key: `class-${starting.index}`, source: starting.name, choose: choice.choose, from: choice.from });
  }
  others.forEach((c) => {
    const choice = multiclassSkillChoice(c);
    if (choice) pools.push({ key: `multi-${c.index}`, source: `${c.name} (multiclass)`, ...choice });
  });

  // The same skill from two sources: take any other skill instead.
  if (overlaps) {
    pools.push({ key: 'overlap', source: 'Doubled up', choose: overlaps, from: ALL_SKILLS, note: 'Two of your sources gave the same skill, so pick another in its place.' });
  }

  return { granted, pools };
};

// Keep only picks that still make sense: in the pool's list, not already granted,
// not taken by an earlier pool, and no more than the pool allows.
export const sanitizePicks = (picks: Record<string, string[]>, granted: GrantedSkill[], pools: SkillPool[]) => {
  const taken = new Set(granted.map((g) => g.skill));
  const out: Record<string, string[]> = {};
  pools.forEach((pool) => {
    const kept = (picks[pool.key] || []).filter((s) => pool.from.includes(s) && !taken.has(s)).slice(0, pool.choose);
    kept.forEach((s) => taken.add(s));
    out[pool.key] = kept;
  });
  return out;
};

// ------------------------------------------------------------------ languages

export interface KnownLanguage {
  language: string;
  source: string;
}

export const buildLanguageSources = ({ race, subrace, background, classes }: Sources) => {
  const known: KnownLanguage[] = [];
  const pools: SkillPool[] = [];
  const know = (language: string, source: string) => {
    if (!known.some((k) => k.language === language)) known.push({ language, source });
  };

  const raceName = subrace?.name || race?.name || 'Race';
  if (race) {
    race.languages.forEach((l) => know(l, race.name));
    const extra = countLanguageChoices([
      race.language_desc,
      ...race.traits.flatMap((t) => t.desc),
      ...(subrace?.racial_traits || []).flatMap((t) => t.desc),
    ]);
    if (extra) pools.push({ key: 'race', source: raceName, choose: extra, from: ALL_LANGUAGES });
  }
  if (background?.languageChoices) {
    pools.push({ key: 'background', source: `${background.name} background`, choose: background.languageChoices, from: ALL_LANGUAGES });
  }
  classes.forEach((c) => CLASS_LANGUAGES[c.index] && know(CLASS_LANGUAGES[c.index], c.name));

  return { known, pools };
};

export const sanitizeLanguagePicks = (picks: Record<string, string[]>, known: KnownLanguage[], pools: SkillPool[]) =>
  sanitizePicks(picks, known.map((k) => ({ skill: k.language, source: k.source })), pools);
