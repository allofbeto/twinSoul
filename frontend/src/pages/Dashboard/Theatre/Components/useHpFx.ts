import { useEffect, useRef, useState } from 'react';

/**
 * Tells a health bar when to react: 'hurt' when total HP (including temporary)
 * just dropped, 'heal' when it just rose. `key` counts the changes: use its
 * parity (`key % 2`) to alternate between two identical animations, which
 * restarts the effect on back-to-back hits without rebuilding the element
 * (rebuilding it would skip the width slide). Nothing fires on first render.
 */
export function useHpFx(hp: number, tempHp: number) {
  const previous = useRef<number | null>(null);
  const [fx, setFx] = useState<{ kind: 'hurt' | 'heal' | ''; key: number }>({ kind: '', key: 0 });

  useEffect(() => {
    const total = hp + tempHp;
    const before = previous.current;
    previous.current = total;
    if (before === null || before === total) return undefined;
    const kind = total < before ? 'hurt' : 'heal';
    setFx((f) => ({ kind, key: f.key + 1 }));
    const timer = window.setTimeout(() => setFx((f) => ({ ...f, kind: '' })), kind === 'hurt' ? 520 : 1100);
    return () => window.clearTimeout(timer);
  }, [hp, tempHp]);

  return fx;
}

/** At or below a quarter of maximum HP, and still standing. */
export const isCritical = (hp: number, maxHp: number) => maxHp > 0 && hp > 0 && hp / maxHp <= 0.25;
