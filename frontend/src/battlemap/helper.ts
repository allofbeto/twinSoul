// The dungeon helper's script: short questions with quick replies, plus a
// forgiving reader for typed answers ("night ambush on a road, burning cart").

import type { Biome, Cover, HazardKind, Structure } from './generate';
import type { GridType } from './grid';
import type { Lighting } from './map';

export type SizeKey = 'S' | 'M' | 'L';
export const SIZES: Record<SizeKey, [number, number]> = { S: [18, 12], M: [24, 16], L: [34, 22] };

export interface Answers {
  biome?: Biome;
  structure?: Structure;
  /** Number of rooms, when the DM said one. */
  rooms?: number;
  hazards?: HazardKind[];
  cover?: Cover;
  lighting?: Lighting;
  size?: SizeKey;
  grid?: GridType;
}

export type QuestionKey = 'biome' | 'structure' | 'hazards' | 'cover' | 'lighting' | 'size';

export interface Choice<V = string> { value: V; label: string; icon?: string }

export const BIOME_CHOICES: Choice<Biome>[] = [
  { value: 'forest', label: 'Forest', icon: '🌲' },
  { value: 'road', label: 'Road', icon: '🛤' },
  { value: 'river', label: 'River crossing', icon: '🌊' },
  { value: 'cave', label: 'Cave', icon: '🕳' },
  { value: 'tavern', label: 'Tavern / inside', icon: '🍺' },
  { value: 'ruins', label: 'Ruins', icon: '🏚' },
];
export const STRUCTURE_CHOICES: Choice<Structure>[] = [
  { value: 'none', label: 'Open ground', icon: '🌾' },
  { value: 'hut', label: 'A hut or cabin', icon: '🛖' },
  { value: 'rooms', label: 'A building with rooms', icon: '🏠' },
  { value: 'ruins', label: 'Crumbling walls', icon: '🧱' },
];
export const HAZARD_CHOICES: Choice<HazardKind>[] = [
  { value: 'pit', label: 'Pits', icon: '🕳' },
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'water', label: 'Water', icon: '💧' },
  { value: 'mud', label: 'Mud / swamp', icon: '🟫' },
  { value: 'rubble', label: 'Rubble', icon: '🪨' },
  { value: 'trap', label: 'Hidden traps', icon: '⚠' },
  { value: 'high', label: 'High ground', icon: '⛰' },
];
export const COVER_CHOICES: Choice<Cover>[] = [
  { value: 'open', label: 'Wide open', icon: '◻' },
  { value: 'some', label: 'Some cover', icon: '◧' },
  { value: 'lots', label: 'Lots to hide behind', icon: '▦' },
];
export const LIGHT_CHOICES: Choice<Lighting>[] = [
  { value: 'bright', label: 'Daylight', icon: '☀' },
  { value: 'dim', label: 'Dusk / dim', icon: '◐' },
  { value: 'dark', label: 'Night / dark', icon: '☾' },
];
export const SIZE_CHOICES: Choice<SizeKey>[] = [
  { value: 'S', label: 'Quick skirmish', icon: '·' },
  { value: 'M', label: 'Proper fight', icon: '••' },
  { value: 'L', label: 'Big battle', icon: '•••' },
];

/** What the helper asks, in order. Indoor places skip the buildings question. */
export function nextQuestion(a: Answers): QuestionKey | null {
  if (!a.biome) return 'biome';
  if (a.structure === undefined && a.biome !== 'tavern' && a.biome !== 'cave') return 'structure';
  if (a.hazards === undefined) return 'hazards';
  if (!a.cover) return 'cover';
  if (!a.lighting) return 'lighting';
  if (!a.size) return 'size';
  return null;
}

const pick = <T,>(xs: T[], r: () => number) => xs[Math.floor(r() * xs.length)];

export const QUESTION_TEXT: Record<QuestionKey, (a: Answers, r: () => number) => string> = {
  biome: (_, r) => pick(['Uh oh. Where did they get themselves into trouble?', 'Trouble already? Where are they?', 'Right, a fight. Where does it happen?'], r),
  structure: (a) => (a.biome === 'ruins' ? 'Anything still standing?' : 'Any buildings or rooms out there?'),
  hazards: (_, r) => pick(['Any environmental hazards? Pick as many as you like.', 'What makes this place dangerous? Pick any.'], r),
  cover: () => 'How much is there to hide behind?',
  lighting: () => 'What time is it — how’s the light?',
  size: () => 'How big a fight?',
};

const has = (t: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`, 'i').test(t));

/**
 * Pulls whatever answers it can out of free text. `asking` is the open
 * question, so "none" or "both" can be read in context.
 */
export function readAnswers(text: string, asking: QuestionKey | null): Answers {
  const t = text.toLowerCase();
  const out: Answers = {};

  if (has(t, ['forest', 'wood', 'tree', 'jungle', 'grove', 'glade', 'clearing'])) out.biome = 'forest';
  if (has(t, ['road', 'path', 'highway', 'cart', 'wagon', 'caravan', 'trail'])) out.biome = 'road';
  if (has(t, ['river', 'stream', 'bridge', 'ford', 'creek'])) out.biome = 'river';
  if (has(t, ['cave', 'cavern', 'tunnel', 'underground', 'mine', 'grotto', 'dungeon', 'underdark'])) out.biome = 'cave';
  if (has(t, ['tavern', 'inn', 'bar', 'pub', 'inside', 'indoors', 'hall', 'kitchen'])) out.biome = 'tavern';
  if (has(t, ['ruin', 'temple', 'castle', 'crumbl', 'abandoned', 'shrine', 'tower'])) out.biome = 'ruins';

  if (has(t, ['hut', 'cabin', 'shack', 'cottage', 'shed'])) out.structure = 'hut';
  if (has(t, ['building', 'house', 'manor', 'farmhouse', 'barn', 'keep'])) out.structure = 'rooms';
  if (has(t, ['walls', 'ruined', 'broken wall'])) out.structure = out.structure ?? 'ruins';
  const WORDS: Record<string, number> = { one: 1, a: 1, single: 1, two: 2, couple: 2, three: 3, few: 3, four: 4, five: 5, several: 5, six: 6, seven: 7, eight: 8, lots: 5, many: 5 };
  const rooms = t.match(/\b(\d+|one|a|single|two|couple(?: of)?|three|few|four|five|several|six|seven|eight|lots of|many)\s+(?:\w+\s+)?(rooms?|chambers?)\b/);
  if (rooms) {
    const word = rooms[1].replace(/ of$/, '');
    const n = Number(word) || WORDS[word] || 3;
    out.rooms = Math.max(1, Math.min(8, n));
    out.structure = n === 1 ? 'hut' : 'rooms';
  } else if (has(t, ['rooms', 'chambers'])) out.structure = 'rooms';

  const hazards: HazardKind[] = [];
  if (has(t, ['pit', 'hole', 'chasm', 'sinkhole', 'crevasse'])) hazards.push('pit');
  if (has(t, ['fire', 'burn', 'flame', 'lava', 'blaze', 'campfire', 'ember'])) hazards.push('fire');
  if (has(t, ['water', 'pond', 'lake', 'pool', 'flood']) || (out.biome !== 'river' && has(t, ['stream', 'river']))) hazards.push('water');
  if (has(t, ['mud', 'swamp', 'bog', 'marsh', 'mire'])) hazards.push('mud');
  if (has(t, ['rubble', 'debris', 'collapsed', 'rock'])) hazards.push('rubble');
  if (has(t, ['trap', 'snare', 'tripwire'])) hazards.push('trap');
  if (has(t, ['hill', 'cliff', 'ledge', 'high ground', 'elevat', 'ridge', 'rooftop', 'balcony'])) hazards.push('high');
  if (hazards.length) out.hazards = hazards;

  if (has(t, ['open', 'field', 'plain', 'nothing to hide', 'exposed'])) out.cover = 'open';
  if (has(t, ['dense', 'lots', 'thick', 'cluttered', 'crowded', 'overgrown'])) out.cover = 'lots';

  if (has(t, ['night', 'dark', 'midnight', 'moonless', 'pitch'])) out.lighting = 'dark';
  else if (has(t, ['dusk', 'dawn', 'twilight', 'evening', 'dim', 'moonlight', 'sunset', 'foggy'])) out.lighting = 'dim';
  else if (has(t, ['day', 'noon', 'sunny', 'morning', 'afternoon', 'bright'])) out.lighting = 'bright';

  if (has(t, ['small', 'tiny', 'skirmish', 'quick', 'little'])) out.size = 'S';
  if (has(t, ['big', 'huge', 'large', 'massive', 'epic', 'battle'])) out.size = 'L';
  if (has(t, ['medium', 'normal', 'regular'])) out.size = 'M';

  if (has(t, ['hex'])) out.grid = 'hex';
  if (has(t, ['square'])) out.grid = 'square';

  // Short replies to the open question.
  const nothing = /^\s*(no|none|nope|nothing|no hazards|not really|skip|n\/a)\b/i.test(text);
  if (nothing) {
    if (asking === 'hazards') out.hazards = [];
    if (asking === 'structure') out.structure = 'none';
  }
  if (/\b(some|a bit|a little|medium)\b/i.test(t) && asking === 'cover') out.cover = 'some';
  return out;
}

/** "a road at night with fire and pits" — the helper repeating back what it understood. */
export function summarize(a: Answers): string {
  const parts: string[] = [];
  const b = BIOME_CHOICES.find((c) => c.value === a.biome);
  if (b) parts.push(b.label.toLowerCase());
  const s = STRUCTURE_CHOICES.find((c) => c.value === a.structure);
  if (a.rooms) parts.push(`${a.rooms} room${a.rooms === 1 ? '' : 's'}`);
  else if (s && s.value !== 'none') parts.push(s.label.toLowerCase());
  if (a.hazards?.length) parts.push(a.hazards.map((h) => HAZARD_CHOICES.find((c) => c.value === h)?.label.toLowerCase()).join(', '));
  const l = LIGHT_CHOICES.find((c) => c.value === a.lighting);
  if (l) parts.push(l.label.toLowerCase());
  const c = COVER_CHOICES.find((x) => x.value === a.cover);
  if (c) parts.push(c.label.toLowerCase());
  return parts.join(' · ');
}

/** Fill everything still missing with something reasonable (for "surprise me"). */
export function surprise(a: Answers, r: () => number): Required<Omit<Answers, 'grid' | 'rooms'>> & { grid?: GridType; rooms?: number } {
  const biome = a.biome ?? pick(BIOME_CHOICES, r).value;
  const indoor = biome === 'tavern' || biome === 'cave';
  const hazards = a.hazards ?? HAZARD_CHOICES.map((h) => h.value).filter(() => r() < 0.3);
  return {
    biome,
    structure: a.structure ?? (indoor ? 'none' : pick(STRUCTURE_CHOICES, r).value),
    hazards,
    cover: a.cover ?? pick(COVER_CHOICES, r).value,
    lighting: a.lighting ?? (biome === 'cave' ? 'dark' : pick(['bright', 'bright', 'dim', 'dark'] as Lighting[], r)),
    size: a.size ?? 'M',
    grid: a.grid,
    rooms: a.rooms,
  };
}
