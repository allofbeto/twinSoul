// Ascending challenge ratings, paired with the numeric value stored in
// monsters.cr_numeric — used to build the min/max CR filter dropdowns.
export const CR_STEPS: { label: string; value: number }[] = [
  { label: '0', value: 0 },
  { label: '1/8', value: 0.125 },
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  ...Array.from({ length: 30 }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
];

export const HABITAT_LABEL: Record<string, string> = {
  arctic: 'Arctic',
  coastal: 'Coastal',
  desert: 'Desert',
  forest: 'Forest',
  grassland: 'Grassland',
  hill: 'Hill',
  mountain: 'Mountain',
  swamp: 'Swamp',
  underdark: 'Underdark',
  underwater: 'Underwater',
  urban: 'Urban',
  planar: 'Planar',
};
