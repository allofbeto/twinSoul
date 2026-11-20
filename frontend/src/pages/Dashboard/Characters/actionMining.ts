// Mine "as an action" / "as a bonus action" etc from text descriptions,
// creating SheetAction entries for them.

import { ActionKind, SheetAction } from './actionTypes';

type Timing = 'action' | 'bonus' | 'reaction' | 'free';

const ACTION_PATTERNS: { regex: RegExp; timing: Timing; label: string }[] = [
  { regex: /\bas\s+an?\s+reaction\b/i, timing: 'reaction', label: 'Reaction' },
  { regex: /\bas\s+a\s+bonus\s+action\b/i, timing: 'bonus', label: 'Bonus Action' },
  { regex: /\bas\s+an?\s+action\b/i, timing: 'action', label: 'Action' },
  { regex: /\bas\s+a\s+free\s+action\b/i, timing: 'free', label: 'Free Action' },
];

/** Extract the timing and a brief description from text that mentions "as an action" etc. */
export const minedActionsFromText = (text: string | undefined, name: string, source: SheetAction['source']): SheetAction[] => {
  if (!text) return [];
  const out: SheetAction[] = [];
  const seen = new Set<Timing>();

  for (const { regex, timing, label } of ACTION_PATTERNS) {
    if (seen.has(timing) || !regex.test(text)) continue;
    seen.add(timing);

    const kind: ActionKind = timing === 'free' ? 'other' : timing;
    const match = regex.exec(text);
    if (!match) continue;

    // Extract context around the match for the description: the sentence or clause containing it.
    const start = Math.max(0, match.index - 100);
    const end = Math.min(text.length, match.index + match[0].length + 150);
    let context = text.substring(start, end).trim();
    if (start > 0) context = `…${context}`;
    if (end < text.length) context = `${context}…`;

    out.push({
      id: `mined:${source}:${name}:${timing}`,
      name: label === 'Free Action' ? `${name} (free)` : name,
      kind,
      notes: `${label}. ${context}`,
      tag: undefined,
      description: text,
      source,
    });
  }

  return out;
};
