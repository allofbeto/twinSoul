// Standard D&D 5e (SRD) challenge rating -> XP value lookup, used to price
// homebrew and custom combatants that don't carry their own `xp` field.
export const CR_TO_XP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

export const CR_OPTIONS = Object.keys(CR_TO_XP);

export const xpForChallengeRating = (cr: string | null | undefined): number =>
  cr ? CR_TO_XP[cr] ?? 0 : 0;

// DMG "XP Thresholds by Character Level" — index 0 unused, index = level (1-20).
export const XP_THRESHOLDS: Array<{ easy: number; medium: number; hard: number; deadly: number }> = [
  { easy: 0, medium: 0, hard: 0, deadly: 0 },
  { easy: 25, medium: 50, hard: 75, deadly: 100 },
  { easy: 50, medium: 100, hard: 150, deadly: 200 },
  { easy: 75, medium: 150, hard: 225, deadly: 400 },
  { easy: 125, medium: 250, hard: 375, deadly: 500 },
  { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
];

// DMG "Encounter Multipliers" by number of monsters in the encounter.
const MULTIPLIER_STEPS = [1, 1.5, 2, 2.5, 3, 4];

const stepForCount = (count: number) => {
  if (count <= 1) return 0;
  if (count === 2) return 1;
  if (count <= 6) return 2;
  if (count <= 10) return 3;
  if (count <= 14) return 4;
  return 5;
};

// Small parties (<3) fight effectively tougher encounters; large parties
// (6+) fight effectively easier ones — DMG bumps the multiplier a step
// each way.
export const encounterMultiplier = (monsterCount: number, partySize: number): number => {
  if (monsterCount <= 0) return 1;
  let step = stepForCount(monsterCount);
  if (partySize > 0 && partySize < 3) step = Math.min(step + 1, MULTIPLIER_STEPS.length - 1);
  if (partySize >= 6) step = Math.max(step - 1, 0);
  return MULTIPLIER_STEPS[step];
};

export type Difficulty = 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Deadly';

export const difficultyFor = (adjustedXp: number, partyLevels: number[]): Difficulty => {
  if (partyLevels.length === 0) return 'Trivial';
  const totals = partyLevels.reduce(
    (acc, level) => {
      const t = XP_THRESHOLDS[Math.min(Math.max(level, 1), 20)];
      acc.easy += t.easy;
      acc.medium += t.medium;
      acc.hard += t.hard;
      acc.deadly += t.deadly;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0 }
  );

  if (adjustedXp >= totals.deadly) return 'Deadly';
  if (adjustedXp >= totals.hard) return 'Hard';
  if (adjustedXp >= totals.medium) return 'Medium';
  if (adjustedXp >= totals.easy) return 'Easy';
  return 'Trivial';
};
