// Session notebook data model. Stored as JSON in sessions.notes (no schema
// change). v3 beats have fixed, optional sections instead of free blocks.
// Older notes — v2 block-based beats, or a single legacy Tiptap HTML string —
// are upgraded on load so nothing is lost.

export type BeatType = 'hook' | 'talk' | 'explore' | 'fight' | 'puzzle' | 'reveal' | 'cliff' | 'other';

export interface BeatNpc {
  /** Stable key for rendering. */
  key: string;
  /** Campaign NPC id; empty when the name was typed without linking. */
  id: string;
  name: string;
  /** Tiptap HTML: talking points. */
  points: string;
}

export interface Beat {
  id: string;
  title: string;
  done: boolean;
  type: BeatType;
  /** Tiptap HTML (carries @ / # / "/" mention chips). */
  read: string;
  npcs: BeatNpc[];
  /** Clues / loot — or, depending on type, solution & hints, what they learn, next-time hook. */
  find: string;
  /** "If the players…" options. */
  branches: string;
  encounter?: { id: string; name: string };
  /** Battle map for this beat's fight (random fights get one automatically). */
  map?: { id: string; name: string };
  trackId?: string;
  musicUrl?: string;
  artUrl?: string;
  /** Private DM note. */
  note: string;
}

export interface Scene {
  id: string;
  title: string;
  purpose: string;
  beats: Beat[];
}

export interface Notebook {
  v: 3;
  scenes: Scene[];
}

export type SectionKey = 'read' | 'npcs' | 'find' | 'branches' | 'stage' | 'note';

export interface BeatTypeInfo {
  type: BeatType;
  label: string;
  icon: string;
  /** One-line prompt for the beat's title in the guided builder. */
  ask: string;
  /** Sections the guided builder walks through, in order. */
  steps: SectionKey[];
}

export const BEAT_TYPES: BeatTypeInfo[] = [
  { type: 'hook', label: 'Hook', icon: '✦', ask: 'What draws the players in?', steps: ['read', 'stage'] },
  { type: 'talk', label: 'Talk', icon: '❝', ask: 'Who are they talking to, and why?', steps: ['npcs', 'branches'] },
  { type: 'explore', label: 'Explore', icon: '⌕', ask: 'Where are they, and what are they looking for?', steps: ['read', 'find'] },
  { type: 'fight', label: 'Fight', icon: '⚔', ask: 'Who attacks, and where?', steps: ['stage', 'branches'] },
  { type: 'puzzle', label: 'Puzzle', icon: '◇', ask: 'What stands in their way?', steps: ['read', 'find'] },
  { type: 'reveal', label: 'Reveal', icon: '!', ask: 'What do they discover?', steps: ['read', 'find'] },
  { type: 'cliff', label: 'Cliffhanger', icon: '☾', ask: 'How does the session end?', steps: ['read', 'find'] },
  { type: 'other', label: 'Other', icon: '✎', ask: 'What happens?', steps: ['note'] },
];

export const beatType = (t: BeatType | undefined) => BEAT_TYPES.find((b) => b.type === t) ?? BEAT_TYPES[BEAT_TYPES.length - 1];

/** Section label, which for `find` depends on the beat's type. */
export function sectionLabel(key: SectionKey, type: BeatType): string {
  switch (key) {
    case 'read': return '📖 Read aloud';
    case 'npcs': return '✦ Who\'s here';
    case 'branches': return '⑂ If the players…';
    case 'stage': return '▶ Bring on stage';
    case 'note': return '✎ Private note';
    case 'find':
      if (type === 'puzzle') return '◇ Solution & hints';
      if (type === 'reveal') return '! What they learn';
      if (type === 'cliff') return '☾ Next time';
      return '⌕ What they can find';
  }
}

/** The question the guided builder asks for a section. */
export function sectionQuestion(key: SectionKey, type: BeatType): { q: string; hint: string } {
  switch (key) {
    case 'read':
      return type === 'puzzle'
        ? { q: 'Describe the puzzle', hint: 'What the players see — read this out at the table.' }
        : { q: 'Set the scene', hint: 'What do the players see, hear and smell? Read this out at the table.' };
    case 'npcs': return { q: 'Who\'s here?', hint: 'Pick an NPC and jot what they want or know — one point per bullet.' };
    case 'branches':
      return type === 'fight'
        ? { q: 'Twists and tactics', hint: 'If the players… sneak in, retreat, parley — what happens?' }
        : { q: 'If the players…', hint: 'The likely choices and where each one leads.' };
    case 'stage': return type === 'fight'
      ? { q: 'Who\'s fighting?', hint: 'Pick the encounter, and optionally music and art for the stage.' }
      : { q: 'Bring on stage', hint: 'Art or music to show when this beat starts.' };
    case 'note': return { q: 'Notes', hint: 'Anything you want to remember. Players never see this.' };
    case 'find':
      if (type === 'puzzle') return { q: 'How is it solved?', hint: 'The solution, then hints in the order you\'d give them.' };
      if (type === 'reveal') return { q: 'What do they learn?', hint: 'The facts this beat hands over.' };
      if (type === 'cliff') return { q: 'What\'s the hook for next time?', hint: 'The question you want them leaving with.' };
      return { q: 'What can they find?', hint: 'Clues, loot, DCs — one per bullet.' };
  }
}

export const uid = () => Math.random().toString(36).slice(2, 11);

export const newBeat = (title = 'New beat', type: BeatType = 'other'): Beat => ({
  id: uid(), title, done: false, type, read: '', npcs: [], find: '', branches: '', note: '',
});
export const newScene = (title = 'New scene'): Scene => ({ id: uid(), title, purpose: '', beats: [] });

export const emptyNotebook = (): Notebook => ({ v: 3, scenes: [newScene('Scene 1')] });

const isBlank = (html: string | undefined) => !html || !html.replace(/<[^>]+>/g, '').trim();

export const sectionFilled = (b: Beat, key: SectionKey): boolean => {
  switch (key) {
    case 'npcs': return b.npcs.length > 0;
    case 'stage': return !!(b.encounter || b.map || b.trackId || b.musicUrl || b.artUrl);
    default: return !isBlank(b[key]);
  }
};

// ---------------- upgrading older notes ----------------

interface V2Block { id: string; type: string; content: string; url?: string; trackId?: string; npc?: { id: string; name: string } }
interface V2Beat { id: string; title: string; done: boolean; blocks: V2Block[] }
interface V2Scene { id: string; title: string; purpose: string; beats: V2Beat[] }

const join = (a: string, b: string) => (isBlank(a) ? b : isBlank(b) ? a : a + b);
const labelled = (label: string, html: string) => `<p><strong>${label}</strong></p>${html}`;
const link = (url: string, text: string) => `<p><a href="${url.replace(/"/g, '&quot;')}">${text}</a></p>`;

export function upgradeBeat(old: V2Beat): Beat {
  const b = newBeat(old.title, 'other');
  b.id = old.id;
  b.done = !!old.done;
  for (const x of old.blocks ?? []) {
    const c = x.content ?? '';
    switch (x.type) {
      case 'readaloud': b.read = join(b.read, c); break;
      case 'npc': b.npcs.push({ key: x.id || uid(), id: x.npc?.id ?? '', name: x.npc?.name ?? '', points: c }); break;
      case 'clue': b.find = join(b.find, c); break;
      case 'branch': b.branches = join(b.branches, c); break;
      case 'puzzle': if (!isBlank(c)) b.note = join(b.note, labelled('Puzzle', c)); break;
      case 'music':
        if (x.trackId && !b.trackId) b.trackId = x.trackId;
        else if (x.url && !b.musicUrl && !b.trackId) b.musicUrl = x.url;
        else if (x.url) b.note = join(b.note, link(x.url, '♫ Music cue'));
        if (!isBlank(c)) b.note = join(b.note, labelled('Music', c));
        break;
      case 'art':
        if (x.url && !b.artUrl) b.artUrl = x.url;
        else if (x.url) b.note = join(b.note, link(x.url, '▧ Art'));
        if (!isBlank(c)) b.note = join(b.note, labelled('Art', c));
        break;
      default: b.note = join(b.note, c);
    }
  }
  return b;
}

export function parseNotebook(raw: string | null | undefined): Notebook {
  const s = (raw ?? '').trim();
  if (!s) return emptyNotebook();
  if (s.startsWith('{')) {
    try {
      const d = JSON.parse(s);
      if (d && Array.isArray(d.scenes) && d.scenes.length) {
        if (d.v === 3) return d as Notebook;
        if (d.v === 2) {
          return {
            v: 3,
            scenes: (d.scenes as V2Scene[]).map((sc) => ({ ...sc, beats: (sc.beats ?? []).map(upgradeBeat) })),
          };
        }
      }
    } catch {
      /* fall through to legacy */
    }
  }
  // Legacy HTML / plain text → one scene, one beat holding it as a note.
  const beat = newBeat('Notes');
  beat.note = s;
  return { v: 3, scenes: [{ id: uid(), title: 'Scene 1', purpose: '', beats: [beat] }] };
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

/** Every piece of text in a beat, for search and previews. */
const beatTexts = (b: Beat) => [
  b.title, b.read, ...b.npcs.flatMap((n) => [n.name, n.points]), b.find, b.branches, b.encounter?.name ?? '', b.note,
].map(stripHtml);

export function sceneMatches(s: Scene, q: string) {
  if (!q) return true;
  const hay = [s.title, stripHtml(s.purpose), ...s.beats.flatMap(beatTexts)].join(' ').toLowerCase();
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
    .flatMap((s) => [s.title, stripHtml(s.purpose), ...s.beats.flatMap(beatTexts)])
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
    .flatMap((b) => beatTexts(b).slice(1))
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .find(Boolean) ?? '';
  return {
    scenes: nb.scenes.length,
    beats: beats.length,
    done: beats.filter((b) => b.done).length,
    excerpt: excerpt.length > 170 ? `${excerpt.slice(0, 170)}…` : excerpt,
  };
}

// ---------------- what a session means for the theatre ----------------

/** A campaign object a beat points at: an NPC section, or an @ / # mention in its text. */
export interface BeatRef { id: string; kind: 'npc' | 'item' | 'map'; label: string }

const REF_KINDS = new Set(['npc', 'item', 'map']);

/** NPCs, items and locations a beat brings up, in order, without duplicates. */
export function beatRefs(b: Beat): BeatRef[] {
  const out: BeatRef[] = [];
  const seen = new Set<string>();
  const add = (id: string, kind: string, label: string) => {
    if (!id || !REF_KINDS.has(kind) || seen.has(id)) return;
    seen.add(id);
    out.push({ id, kind: kind as BeatRef['kind'], label });
  };
  b.npcs.forEach((n) => add(n.id, 'npc', n.name));
  const html = [b.read, ...b.npcs.map((n) => n.points), b.find, b.branches, b.note].join('');
  if (html.includes('data-id')) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll<HTMLElement>('[data-id]').forEach((el) => {
      // "#" item mentions don't carry a kind; everything else does.
      const kind = el.dataset.kind ?? (el.dataset.type === 'mentionItem' ? 'item' : '');
      add(el.dataset.id ?? '', kind, el.dataset.label ?? el.textContent?.replace(/^\S+\s/, '').trim() ?? '');
    });
  }
  return out;
}

/** A fight the DM has planned in this session's beats. */
export interface PlannedEncounter {
  encounterId: string;
  name: string;
  beatId: string;
  beatTitle: string;
  sceneTitle: string;
  done: boolean;
}

/** Encounters linked from beats, in session order (first mention wins). */
export function plannedEncounters(nb: Notebook): PlannedEncounter[] {
  const out: PlannedEncounter[] = [];
  const seen = new Set<string>();
  nb.scenes.forEach((s) => s.beats.forEach((b) => {
    if (!b.encounter || seen.has(b.encounter.id)) return;
    seen.add(b.encounter.id);
    out.push({ encounterId: b.encounter.id, name: b.encounter.name, beatId: b.id, beatTitle: b.title, sceneTitle: s.title, done: b.done });
  }));
  return out;
}

/** A Fight beat recording a random fight on a quick map, added to the last scene. */
export function withRandomFight(nb: Notebook, map: { id: string; name: string }): Notebook {
  const scenes = nb.scenes.slice();
  const last = scenes.length - 1;
  const beat: Beat = { ...newBeat(`Random fight · ${map.name}`, 'fight'), map };
  scenes[last] = { ...scenes[last], beats: [...scenes[last].beats, beat] };
  return { ...nb, scenes };
}
