import { changeHp, hpColor, hpDisplay, hpRatio } from './hp';

describe('changeHp', () => {
  it('damages real HP, never below zero', () => {
    expect(changeHp({ hp: 20, maxHp: 30 }, -7)).toEqual({ hp: 13, tempHp: 0 });
    expect(changeHp({ hp: 5, maxHp: 30 }, -50)).toEqual({ hp: 0, tempHp: 0 });
  });

  it('heals up to the maximum', () => {
    expect(changeHp({ hp: 20, maxHp: 30 }, 4)).toEqual({ hp: 24, tempHp: 0 });
    expect(changeHp({ hp: 28, maxHp: 30 }, 10)).toEqual({ hp: 30, tempHp: 0 });
  });

  it('soaks damage with temporary HP first', () => {
    expect(changeHp({ hp: 20, maxHp: 30, tempHp: 10 }, -4)).toEqual({ hp: 20, tempHp: 6 });
    expect(changeHp({ hp: 20, maxHp: 30, tempHp: 10 }, -15)).toEqual({ hp: 15, tempHp: 0 });
  });

  it('never lets healing raise or spend temporary HP', () => {
    expect(changeHp({ hp: 10, maxHp: 30, tempHp: 8 }, 5)).toEqual({ hp: 15, tempHp: 8 });
  });

  it('copes with a creature that has no maximum set', () => {
    expect(changeHp({ hp: 0, maxHp: 0 }, 6)).toEqual({ hp: 6, tempHp: 0 });
  });
});

describe('hpDisplay', () => {
  it('shows real plus temporary HP over the maximum', () => {
    const d = hpDisplay({ hp: 120, maxHp: 120, tempHp: 10 });
    expect(`${d.total}/${d.max}`).toBe('130/120');
    expect(d.realPercent).toBe(100);
    expect(d.totalPercent).toBe(100);
  });

  it('shows the temporary portion on the bar when below max', () => {
    const d = hpDisplay({ hp: 50, maxHp: 100, tempHp: 20 });
    expect(d.realPercent).toBe(50);
    expect(d.totalPercent).toBe(70);
  });
});

describe('hpColor', () => {
  it('runs from green to red as HP falls, and is grey at zero', () => {
    expect(hpColor(100, 100)).toBe('hsl(120 70% 46%)');
    expect(hpColor(50, 100)).toBe('hsl(60 70% 46%)');
    expect(hpColor(10, 100)).toBe('hsl(12 70% 46%)');
    expect(hpColor(0, 100)).toBe('hsl(0 0% 40%)');
  });

  it('has a neutral colour when no maximum is set', () => {
    expect(hpColor(5, 0)).toBe('var(--ink-dim)');
    expect(hpRatio(5, 0)).toBe(0);
  });
});
