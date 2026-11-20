import { CSSProperties } from 'react';

const SCHOOLS = new Set([
  'abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation',
]);

/**
 * A faint sigil of the spell's school behind its card. Spread onto the
 * element: className adds the watermark, style points it at the right image.
 * `large` is for detail sheets.
 */
export const sigil = (school?: string | null, large = false): { className: string; style?: CSSProperties } => {
  const key = (school || '').trim().toLowerCase();
  if (!SCHOOLS.has(key)) return { className: '' };
  return {
    className: `has-sigil ${large ? 'has-sigil--lg' : ''}`,
    style: { '--sigil': `url(${process.env.PUBLIC_URL}/school-sigils/${key}.png)` } as CSSProperties,
  };
};
