// Session notebook data model. Stored as JSON in sessions.notes (no schema
// change). Legacy sessions hold a single Tiptap HTML string; parseNotebook
// wraps that into one free-note block so nothing is lost.

export type BlockType = 'readaloud' | 'npc' | 'music' | 'art' | 'puzzle' | 'clue' | 'branch' | 'text';

export interface Block {
  id: string;
  type: BlockType;
  /** Tiptap HTML (carries @ / # / "/" mention chips). */
  content: string;
  /** music / art blocks only. */
  url?: string;
  /** music blocks: the campaign-soundtrack track this cue plays. */
  trackId?: string;
  /** npc blocks only: the campaign NPC this dialogue belongs to. */
  npc?: { id: string; name: string };
}

export interface Beat {
  id: string;
  title: string;
  done: boolean;
  blocks: Block[];
}

export interface Scene {
  id: string;
  title: string;
  purpose: string;
  beats: Beat[];
}

export interface Notebook {
  v: 2;
  scenes: Scene[];
}

export const BLOCK_TYPES: { type: BlockType; label: string; hint: string }[] = [
  { type: 'readaloud', label: '📖 Narration', hint: 'Read-aloud text' },
  { type: 'npc', label: '✦ NPC', hint: 'Talking points' },
  { type: 'puzzle', label: '◇ Puzzle', hint: 'Challenge or ritual' },
  { type: 'clue', label: '⌕ Clue', hint: 'What players can find' },
  { type: 'branch', label: '⑂ If / then', hint: 'Player options' },
  { type: 'music', label: '♫ Music', hint: 'Audio cue' },
  { type: 'art', label: '▧ Art', hint: 'Image reference' },
  { type: 'text', label: '✎ Note', hint: 'Anything else' },
];

export const blockLabel = (t: BlockType) => BLOCK_TYPES.find((b) => b.type === t)?.label ?? '✎ Note';

export const uid = () => Math.random().toString(36).slice(2, 11);

export const newBlock = (type: BlockType, content = ''): Block => ({ id: uid(), type, content });
export const newBeat = (title = 'New beat'): Beat => ({ id: uid(), title, done: false, blocks: [] });
export const newScene = (title = 'New scene'): Scene => ({ id: uid(), title, purpose: '', beats: [newBeat('Opening')] });

export const emptyNotebook = (): Notebook => ({ v: 2, scenes: [newScene('Scene 1')] });

export function parseNotebook(raw: string | null | undefined): Notebook {
  const s = (raw ?? '').trim();
  if (!s) return emptyNotebook();
  if (s.startsWith('{')) {
    try {
      const d = JSON.parse(s);
      if (d && d.v === 2 && Array.isArray(d.scenes) && d.scenes.length) return d as Notebook;
    } catch {
      /* fall through to legacy */
    }
  }
  // Legacy HTML / plain text → one scene, one beat, one free-note block.
  const beat = newBeat('Notes');
  beat.blocks.push(newBlock('text', s));
  return { v: 2, scenes: [{ id: uid(), title: 'Scene 1', purpose: '', beats: [beat] }] };
}

export const serializeNotebook = (n: Notebook) => JSON.stringify(n);

export function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const stripHtml = (h: string) => h.replace(/<[^>]+>/g, ' ');

export function sceneMatches(s: Scene, q: string) {
  if (!q) return true;
  const hay = [s.title, s.purpose, ...s.beats.flatMap((b) => [b.title, ...b.blocks.map((x) => stripHtml(x.content))])]
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export const beatProgress = (n: Notebook) => {
  const beats = n.scenes.flatMap((s) => s.beats);
  return { done: beats.filter((b) => b.done).length, total: beats.length };
};

/** Plain-text preview of a session's notes (notebook JSON or legacy HTML). */
export function notesPreview(raw: string | null | undefined, max = 200): string {
  const nb = parseNotebook(raw);
  const text = nb.scenes
    .flatMap((s) => [s.title, stripHtml(s.purpose), ...s.beats.flatMap((b) => [b.title, ...b.blocks.map((x) => stripHtml(x.content))])])
    .map((t) => t.trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s+/g, ' ');
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Counts and a one-line excerpt for session cards and tables. */
export function notebookStats(raw: string | null | undefined) {
  const nb = parseNotebook(raw);
  const beats = nb.scenes.flatMap((s) => s.beats);
  const excerpt = beats
    .flatMap((b) => b.blocks)
    .map((x) => stripHtml(x.content).replace(/\s+/g, ' ').trim())
    .find(Boolean) ?? '';
  return {
    scenes: nb.scenes.length,
    beats: beats.length,
    done: beats.filter((b) => b.done).length,
    blocks: beats.reduce((n, b) => n + b.blocks.length, 0),
    excerpt: excerpt.length > 170 ? `${excerpt.slice(0, 170)}…` : excerpt,
  };
}
