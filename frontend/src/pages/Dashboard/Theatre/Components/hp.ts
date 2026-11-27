// HP in combat: damage, healing and temporary HP, and the colour that tells you
// at a glance how a creature is doing.

interface HpState {
  hp: number;
  maxHp: number;
  tempHp?: number;
}

/** 0..1 of maximum HP (temporary HP not counted). */
export const hpRatio = (hp: number, maxHp: number) => (maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0);

/** Green when healthy, through yellow and orange to red as HP runs out; grey at 0. */
export const hpColor = (hp: number, maxHp: number) => {
  if (maxHp <= 0) return 'var(--ink-dim)';
  if (hp <= 0) return 'hsl(0 0% 40%)';
  return `hsl(${Math.round(hpRatio(hp, maxHp) * 120)} 70% 46%)`;
};

/**
 * Damage (negative) is soaked by temporary HP first; healing (positive) mends
 * real HP up to the maximum and never touches temporary HP.
 */
export const changeHp = (c: HpState, delta: number): { hp: number; tempHp: number } => {
  const temp = c.tempHp ?? 0;
  if (delta < 0) {
    const soaked = Math.min(temp, -delta);
    return { hp: Math.max(0, c.hp - (-delta - soaked)), tempHp: temp - soaked };
  }
  return { hp: c.maxHp > 0 ? Math.min(c.maxHp, c.hp + delta) : c.hp + delta, tempHp: temp };
};

/** What the bar and the number show: real plus temporary HP, so 120 max with +10 temp reads 130/120. */
export const hpDisplay = (c: HpState) => {
  const temp = c.tempHp ?? 0;
  const total = c.hp + temp;
  return {
    total,
    temp,
    max: c.maxHp,
    realPercent: Math.round(hpRatio(c.hp, c.maxHp) * 100),
    totalPercent: c.maxHp > 0 ? Math.round(Math.min(1, total / c.maxHp) * 100) : 0,
    color: hpColor(c.hp, c.maxHp),
  };
};
