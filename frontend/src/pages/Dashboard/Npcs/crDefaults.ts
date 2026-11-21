// Suggested numbers for a creature of a given challenge rating, and role-based
// ability score spreads. Advice for starting a stat block: nothing here locks
// a value.

export const CR_OPTIONS = ['0', '1/8', '1/4', '1/2', ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

export interface CrGuide {
  prof: number;
  ac: number;
  hp: [number, number];
  attack: number;
  dpr: [number, number];
  dc: number;
}

// [prof, AC, HP min, HP max, attack bonus, damage/round min, max, save DC]
const ROWS: Record<string, [number, number, number, number, number, number, number, number]> = {
  '0': [2, 13, 1, 6, 3, 0, 1, 13],
  '1/8': [2, 13, 7, 35, 3, 2, 3, 13],
  '1/4': [2, 13, 36, 49, 3, 4, 5, 13],
  '1/2': [2, 13, 50, 70, 3, 6, 8, 13],
  '1': [2, 13, 71, 85, 3, 9, 14, 13],
  '2': [2, 13, 86, 100, 3, 15, 20, 13],
  '3': [2, 13, 101, 115, 4, 21, 26, 13],
  '4': [2, 14, 116, 130, 5, 27, 32, 14],
  '5': [3, 15, 131, 145, 6, 33, 38, 15],
  '6': [3, 15, 146, 160, 6, 39, 44, 15],
  '7': [3, 15, 161, 175, 6, 45, 50, 15],
  '8': [3, 16, 176, 190, 7, 51, 56, 16],
  '9': [4, 16, 191, 205, 7, 57, 62, 16],
  '10': [4, 17, 206, 220, 7, 63, 68, 16],
  '11': [4, 17, 221, 235, 8, 69, 74, 17],
  '12': [4, 17, 236, 250, 8, 75, 80, 17],
  '13': [5, 18, 251, 265, 8, 81, 86, 18],
  '14': [5, 18, 266, 280, 8, 87, 92, 18],
  '15': [5, 18, 281, 295, 8, 93, 98, 18],
  '16': [5, 18, 296, 310, 9, 99, 104, 18],
  '17': [6, 19, 311, 325, 10, 105, 110, 19],
  '18': [6, 19, 326, 340, 10, 111, 116, 19],
  '19': [6, 19, 341, 355, 10, 117, 122, 19],
  '20': [6, 19, 356, 400, 10, 123, 140, 19],
  '21': [7, 19, 401, 445, 11, 141, 158, 20],
  '22': [7, 19, 446, 490, 11, 159, 176, 20],
  '23': [7, 19, 491, 535, 11, 177, 194, 20],
  '24': [7, 19, 536, 580, 12, 195, 212, 21],
  '25': [8, 19, 581, 625, 12, 213, 230, 21],
  '26': [8, 19, 626, 670, 12, 231, 248, 21],
  '27': [8, 19, 671, 715, 13, 249, 266, 22],
  '28': [8, 19, 716, 760, 13, 267, 284, 22],
  '29': [9, 19, 761, 805, 13, 285, 302, 22],
  '30': [9, 19, 806, 850, 14, 303, 320, 23],
};

export const guideFor = (cr: string): CrGuide | null => {
  const r = ROWS[cr];
  return r ? { prof: r[0], ac: r[1], hp: [r[2], r[3]], attack: r[4], dpr: [r[5], r[6]], dc: r[7] } : null;
};

export const midHp = (g: CrGuide) => Math.round((g.hp[0] + g.hp[1]) / 2);

export type Role = 'brute' | 'skirmisher' | 'caster' | 'face' | 'sneak' | 'support';

type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export const ROLES: { key: Role; label: string; hint: string; primary: Ability; secondary: Ability }[] = [
  { key: 'brute', label: 'Brute', hint: 'Hits hard and soaks damage', primary: 'strength', secondary: 'constitution' },
  { key: 'skirmisher', label: 'Skirmisher', hint: 'Fast, mobile, ranged or finesse', primary: 'dexterity', secondary: 'constitution' },
  { key: 'caster', label: 'Caster', hint: 'Spells over steel', primary: 'intelligence', secondary: 'constitution' },
  { key: 'face', label: 'Face', hint: 'Talks first, fights second', primary: 'charisma', secondary: 'wisdom' },
  { key: 'sneak', label: 'Sneak', hint: 'Stealth, tricks, ambush', primary: 'dexterity', secondary: 'intelligence' },
  { key: 'support', label: 'Support', hint: 'Heals, buffs, advises', primary: 'wisdom', secondary: 'charisma' },
];

const crNumber = (cr: string) => (cr.includes('/') ? Number(cr.split('/')[0]) / Number(cr.split('/')[1]) : Number(cr)) || 0;

/** A spread of ability scores that suits the role at this CR (everything else stays average). */
export const scoresFor = (role: Role, cr: string): Record<Ability, number> => {
  const n = crNumber(cr);
  const primary = Math.min(20, 12 + Math.round(Math.sqrt(n) * 1.8));
  const secondary = Math.max(10, primary - 3);
  const info = ROLES.find((r) => r.key === role)!;
  const out: Record<Ability, number> = {
    strength: 10, dexterity: 10, constitution: Math.min(18, 10 + Math.round(n / 3)),
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  out[info.primary] = primary;
  out[info.secondary] = Math.max(out[info.secondary], secondary);
  return out;
};
