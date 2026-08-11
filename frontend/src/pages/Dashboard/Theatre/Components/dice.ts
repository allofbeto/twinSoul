import type { RollResult } from './types';

/** Supports "1d20+5", "2d6", "d20-1", "1d8+1d6+2". */
export function rollExpression(raw: string): RollResult | null {
  const cleaned = raw.replace(/\s+/g, '').toLowerCase();
  if (!cleaned) return null;

  const termRe = /([+-]?)(\d*d\d+|\d+)/g;
  // Reject anything that isn't fully made of valid terms.
  if (cleaned.replace(termRe, '') !== '') return null;

  termRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  let total = 0;
  let matched = false;
  const parts: string[] = [];

  while ((match = termRe.exec(cleaned)) !== null) {
    matched = true;
    const sign = match[1] === '-' ? -1 : 1;
    const token = match[2];

    if (token.includes('d')) {
      const [countStr, sidesStr] = token.split('d');
      const count = countStr === '' ? 1 : parseInt(countStr, 10);
      const sides = parseInt(sidesStr, 10);
      if (!sides || count < 1 || count > 100) return null;

      const rolls: number[] = [];
      for (let i = 0; i < count; i += 1) {
        rolls.push(1 + Math.floor(Math.random() * sides));
      }
      const sub = rolls.reduce((a, b) => a + b, 0) * sign;
      total += sub;
      parts.push(`${sign < 0 ? '−' : ''}${count}d${sides}[${rolls.join(', ')}]`);
    } else {
      const val = parseInt(token, 10);
      total += val * sign;
      parts.push(`${sign < 0 ? '−' : '+'}${val}`);
    }
  }

  if (!matched) return null;
  return { expr: cleaned, total, detail: parts.join(' ') };
}