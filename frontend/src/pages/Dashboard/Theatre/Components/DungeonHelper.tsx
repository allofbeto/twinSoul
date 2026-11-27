import { useEffect, useMemo, useRef, useState } from 'react';
import { interpretMapText } from '../../../../api/backendHelpers';
import BattleMapView from '../../../../battlemap/BattleMapView';
import { generateFromRecipe, type HazardKind } from '../../../../battlemap/generate';
import type { GridType } from '../../../../battlemap/grid';
import {
  BIOME_CHOICES, COVER_CHOICES, HAZARD_CHOICES, LIGHT_CHOICES, QUESTION_TEXT, SIZES, SIZE_CHOICES, STRUCTURE_CHOICES,
  nextQuestion, readAnswers, summarize, surprise, type Answers, type Choice, type QuestionKey,
} from '../../../../battlemap/helper';
import type { BattleMap } from '../../../../battlemap/map';

interface Message { id: number; from: 'helper' | 'dm'; text: string; preview?: boolean }

interface Props {
  /** Remembered between fights. */
  defaultGrid: GridType;
  onGridChange: (g: GridType) => void;
  /** Mid-fight "Change" rather than a fresh fight. */
  changing?: boolean;
  busy?: boolean;
  onUse: (map: BattleMap) => void;
  onCancel?: () => void;
}

const CHOICES: Record<QuestionKey, Choice[]> = {
  biome: BIOME_CHOICES, structure: STRUCTURE_CHOICES, hazards: HAZARD_CHOICES, cover: COVER_CHOICES, lighting: LIGHT_CHOICES, size: SIZE_CHOICES,
};
const REVISIT: { key: QuestionKey; label: string }[] = [
  { key: 'biome', label: 'The place' }, { key: 'structure', label: 'Buildings' }, { key: 'hazards', label: 'Hazards' },
  { key: 'cover', label: 'Cover' }, { key: 'lighting', label: 'Light' }, { key: 'size', label: 'Size' },
];

let rngSeed = Date.now() % 100000;
const rand = () => { rngSeed = (rngSeed * 16807) % 2147483647; return rngSeed / 2147483647; };

// A quick back-and-forth that ends in a battle map: tap answers or just type
// ("night ambush on a road, burning cart"). Every question can be skipped.
export default function DungeonHelper({ defaultGrid, onGridChange, changing, busy, onUse, onCancel }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Answers>({ grid: defaultGrid });
  const [typing, setTyping] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [revisiting, setRevisiting] = useState(false);
  const idRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const asking = nextQuestion(answers);
  const done = asking === null;

  const say = (from: Message['from'], msg: string, preview = false) =>
    setMessages((prev) => [...prev, { id: (idRef.current += 1), from, text: msg, preview }]);

  // The helper "types" for a moment before each reply, which reads more naturally.
  const helperSays = (msg: string, preview = false) => {
    setTyping(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setTyping(false); say('helper', msg, preview); }, 380);
  };

  const ask = (a: Answers, lead?: string) => {
    const q = nextQuestion(a);
    if (q) helperSays(`${lead ? `${lead} ` : ''}${QUESTION_TEXT[q](a, rand)}`);
    else helperSays(`${lead ? `${lead} ` : ''}Here’s your ${summarize(a) || 'map'}. Fight here?`, true);
  };

  useEffect(() => {
    ask(answers, changing ? 'Change of scenery?' : undefined);
    return () => clearTimeout(timer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const preview = useMemo<BattleMap | null>(() => {
    if (!done) return null;
    const full = surprise(answers, () => 0.5);
    const [width, height] = SIZES[full.size];
    return generateFromRecipe({
      biome: full.biome, structure: full.structure, rooms: answers.rooms, hazards: full.hazards, cover: full.cover,
      lighting: full.lighting, grid: answers.grid ?? defaultGrid, width, height, seed,
    });
  }, [done, answers, seed, defaultGrid]);

  const answer = (patch: Answers, said: string) => {
    const next = { ...answers, ...patch };
    say('dm', said);
    setAnswers(next);
    setPicked(new Set());
    setRevisiting(false);
    ask(next);
  };

  const choose = (q: QuestionKey, c: Choice) => answer({ [q]: c.value } as Answers, `${c.icon ? `${c.icon} ` : ''}${c.label}`);

  const finishHazards = (none = false) => {
    const list = none ? [] : HAZARD_CHOICES.filter((h) => picked.has(h.value)).map((h) => h.value);
    answer({ hazards: list }, none || !list.length ? 'No hazards' : HAZARD_CHOICES.filter((h) => picked.has(h.value)).map((h) => `${h.icon} ${h.label}`).join(', '));
  };

  const surpriseMe = () => {
    const full = surprise(answers, rand);
    say('dm', '⚡ Surprise me');
    setAnswers({ ...full, grid: answers.grid });
    setPicked(new Set());
    ask(full, 'Ooh, let’s see…');
  };

  // Typed messages go to the helper's reader (Claude) first; if that's not
  // available, the built-in keyword reader takes over.
  const [thinking, setThinking] = useState(false);
  const send = async () => {
    const raw = text.trim();
    if (!raw || thinking) return;
    setText('');
    say('dm', raw);
    setThinking(true);
    setTyping(true);
    try {
      const { data } = await interpretMapText({ text: raw, answers, asking });
      applyRead(data);
    } catch {
      setTyping(false);
      readLocally(raw);
    } finally {
      setThinking(false);
    }
  };

  interface Read {
    biome?: Answers['biome']; structure?: Answers['structure']; rooms?: number; cover?: Answers['cover'];
    lighting?: Answers['lighting']; size?: Answers['size']; grid?: Answers['grid'];
    hazards_add?: HazardKind[]; hazards_remove?: HazardKind[]; no_hazards?: boolean; new_layout?: boolean; reply?: string;
  }
  const applyRead = (d: Read) => {
    const next: Answers = { ...answers };
    (['biome', 'structure', 'rooms', 'cover', 'lighting', 'size', 'grid'] as const).forEach((k) => {
      if (d[k] !== undefined) (next as Record<string, unknown>)[k] = d[k];
    });
    if (d.structure && d.structure !== 'rooms' && d.rooms === undefined) delete next.rooms;
    if (d.no_hazards) next.hazards = [];
    else if (d.hazards_add?.length || d.hazards_remove?.length) {
      const set = new Set<HazardKind>([...(answers.hazards ?? []), ...(d.hazards_add ?? [])]);
      (d.hazards_remove ?? []).forEach((h) => set.delete(h));
      next.hazards = Array.from(set);
    }
    if (d.grid) onGridChange(d.grid);
    if (d.new_layout) setSeed((x) => x + 1);
    setAnswers(next);
    setPicked(new Set());
    setRevisiting(false);
    const q = nextQuestion(next);
    const reply = d.reply?.trim() || 'Got it.';
    setTyping(false);
    if (q) say('helper', `${reply} ${QUESTION_TEXT[q](next, rand)}`);
    else say('helper', reply, true);
  };

  const readLocally = (raw: string) => {
    const got = readAnswers(raw, asking);
    if (got.grid) onGridChange(got.grid);
    const keys = Object.keys(got) as (keyof Answers)[];
    if (!keys.length) {
      helperSays('Hmm, I didn’t catch that. Tap an option, or try something like “swampy forest at night with a hut”.');
      return;
    }
    // Hazards add up ("add a pit"); "no fire" / "without traps" takes one away.
    const removed = new Set((raw.match(/\b(?:no|without|remove|lose)\s+(?:the\s+)?[a-z ]{2,20}/gi) ?? [])
      .flatMap((phrase) => readAnswers(phrase.replace(/^\S+\s+/, ''), null).hazards ?? []));
    if (got.hazards && answers.hazards && got.hazards.length) got.hazards = Array.from(new Set([...answers.hazards, ...got.hazards]));
    if (removed.size) got.hazards = (got.hazards ?? answers.hazards ?? []).filter((h) => !removed.has(h));
    const next = { ...answers, ...got };
    setAnswers(next);
    setPicked(new Set());
    setRevisiting(false);
    const label = (h: string) => HAZARD_CHOICES.find((c) => c.value === h)?.label.toLowerCase() ?? h;
    const added = (got.hazards ?? []).filter((h) => !(answers.hazards ?? []).includes(h));
    const heard = [
      summarize({ ...got, hazards: undefined }),
      answers.hazards && added.length ? `added ${added.map(label).join(', ')}` : !answers.hazards && got.hazards?.length ? got.hazards.map(label).join(', ') : '',
      removed.size ? `no more ${Array.from(removed).map(label).join(', ')}` : '',
    ].filter(Boolean).join(', ');
    ask(next, heard ? `Got it — ${heard}.` : 'Got it.');
  };

  const revisit = (key: QuestionKey) => {
    const next = { ...answers };
    delete next[key];
    say('dm', `Change ${REVISIT.find((r) => r.key === key)?.label.toLowerCase()}`);
    setAnswers(next);
    setRevisiting(false);
    if (key === 'hazards') setPicked(new Set(answers.hazards ?? []));
    ask(next);
  };

  const setGrid = (g: GridType) => { setAnswers((a) => ({ ...a, grid: g })); onGridChange(g); };

  const replies = !typing && (
    <div className="theatre__helper-replies" role="group" aria-label="Quick replies">
      {revisiting ? (
        <>
          {REVISIT.filter((r) => !(r.key === 'structure' && (answers.biome === 'tavern' || answers.biome === 'cave'))).map((r) => (
            <button key={r.key} type="button" className="theatre__helper-chip" onClick={() => revisit(r.key)}>{r.label}</button>
          ))}
          <button type="button" className="theatre__helper-chip theatre__helper-chip--ghost" onClick={() => setRevisiting(false)}>Never mind</button>
        </>
      ) : done ? (
        <>
          <button type="button" className="theatre__helper-chip theatre__helper-chip--go" disabled={busy || !preview} onClick={() => preview && onUse(preview)}>
            {busy ? 'Setting the scene…' : '⚔ Fight here'}
          </button>
          <button type="button" className="theatre__helper-chip" onClick={() => { setSeed((s) => s + 1); say('dm', '↻ Another one'); helperSays('How about this one?', true); }}>↻ Another one</button>
          <button type="button" className="theatre__helper-chip" onClick={() => setRevisiting(true)}>✎ Change something</button>
          <span className="theatre__seg theatre__seg--sm" role="radiogroup" aria-label="Grid">
            {(['square', 'hex'] as GridType[]).map((g) => <button key={g} type="button" role="radio" aria-checked={(answers.grid ?? defaultGrid) === g} className={(answers.grid ?? defaultGrid) === g ? 'is-on' : ''} onClick={() => setGrid(g)}>{g === 'square' ? '▦ Square' : '⬡ Hex'}</button>)}
          </span>
        </>
      ) : asking === 'hazards' ? (
        <>
          {HAZARD_CHOICES.map((c) => (
            <button key={c.value} type="button" aria-pressed={picked.has(c.value)} className={`theatre__helper-chip ${picked.has(c.value) ? 'is-on' : ''}`}
              onClick={() => setPicked((prev) => { const n = new Set(prev); if (n.has(c.value)) n.delete(c.value); else n.add(c.value); return n; })}>
              <span aria-hidden="true">{c.icon}</span> {c.label}
            </button>
          ))}
          <button type="button" className="theatre__helper-chip theatre__helper-chip--go" onClick={() => finishHazards(false)}>{picked.size ? `That’s it (${picked.size}) ›` : 'Done ›'}</button>
          <button type="button" className="theatre__helper-chip theatre__helper-chip--ghost" onClick={() => finishHazards(true)}>None</button>
        </>
      ) : asking ? (
        <>
          {CHOICES[asking].map((c) => (
            <button key={c.value} type="button" className="theatre__helper-chip" onClick={() => choose(asking, c)}>
              {c.icon && <span aria-hidden="true">{c.icon}</span>} {c.label}
            </button>
          ))}
          {asking === 'size' && (
            <span className="theatre__seg theatre__seg--sm" role="radiogroup" aria-label="Grid">
              {(['square', 'hex'] as GridType[]).map((g) => <button key={g} type="button" role="radio" aria-checked={(answers.grid ?? defaultGrid) === g} className={(answers.grid ?? defaultGrid) === g ? 'is-on' : ''} onClick={() => setGrid(g)}>{g === 'square' ? '▦ Square' : '⬡ Hex'}</button>)}
            </span>
          )}
          <button type="button" className="theatre__helper-chip theatre__helper-chip--ghost" onClick={surpriseMe} title="Fill in the rest for me">⚡ Surprise me</button>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="theatre__helper">
      <div className="theatre__helper-head">
        <span className="theatre__helper-avatar" aria-hidden="true">🐉</span>
        <div>
          <strong>Dungeon helper</strong>
          <small>Answer a few quick questions — or just describe the place.</small>
        </div>
        {onCancel && <button type="button" className="theatre__mini" onClick={onCancel}>Cancel</button>}
      </div>

      <div className="theatre__helper-log" ref={logRef} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`theatre__helper-msg is-${m.from}`}>
            <p>{m.text}</p>
            {m.preview && preview && m.id === Math.max(...messages.filter((x) => x.preview).map((x) => x.id)) && (
              <div className="theatre__helper-preview"><BattleMapView map={preview} fit showGrid={preview.width <= 26} /></div>
            )}
          </div>
        ))}
        {typing && <div className="theatre__helper-msg is-helper is-typing" aria-label="Helper is typing"><span /><span /><span /></div>}
      </div>

      {replies}

      <form className="theatre__helper-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          className="theatre__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={done ? 'Tweak it: “make it night”, “add a pit”, “hex”…' : 'Or type it: “ambush on a road at night, burning cart”'}
          aria-label="Describe the place"
          maxLength={240}
        />
        <button type="submit" className="theatre__btn" disabled={!text.trim() || thinking}>{thinking ? '…' : 'Send'}</button>
      </form>
    </div>
  );
}
