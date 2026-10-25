import React, { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { getCharacter, getItem, updateCharacter, updateItem } from '../../api/backendHelpers';
import { useAuth } from '../../context/AuthContext';
import TrackCard from './TrackCard';
import { useCampaignTracks } from './useTracks';
import { kindIcon } from '../formComponents/editor/CampaignObjectMention';
import { renderNotes } from '../../pages/Dashboard/Theatre/Components/sanitizeNotes';
import { rollExpression } from '../../pages/Dashboard/Theatre/Components/dice';
import { ABILITY_SCORES, DND_SKILLS } from '../../pages/Dashboard/Characters/constants';
import { SPELL_LEVEL_LABEL, attackBonusOf, attackDieOf, checkOf, customRollOf, damageRollsOf, saveTextOf, statblockFrom, type Feature, type GearItem, type Spell } from '../../pages/Dashboard/Npcs/statblock';

interface Target { id: string; kind: string; label: string }

interface Entity {
  name: string;
  icon: string;
  kindLabel: string;
  subtitle?: string;
  image?: string | null;
  stats: { label: string; value: string | number }[];
  notes?: string | null;
  href: string;
  id: string;
  kind: string;
  /** Who may edit it (characters and NPCs are owner-only on the server). */
  ownerId?: string;
  campaignId?: string | null;
  hp?: Hp;
  /** Quick-view only. */
  abilities?: { key: string; label: string; score: number; mod: number }[];
  proficiency?: number;
  skills?: { name: string; bonus: number; proficient: boolean }[];
  /** Passive Perception, initiative, etc. — flat numbers worth glancing at. */
  derived?: { label: string; value: number | string }[];
  sections?: { title: string; entries: Feature[]; open?: boolean }[];
  /** Ability mods + proficiency, so feature rows can derive their to-hit. */
  calc?: { mods: Record<string, number>; pb: number; skills: string[] };
  /** Speed / senses / languages / defenses — plain reference lines. */
  info?: { label: string; value: string }[];
  spellbook?: {
    ability?: string;
    dc?: number;
    attack?: number;
    slots: [string, number][];
    levels: { level: number; spells: Spell[] }[];
  };
  equipment?: GearItem[];
}

export interface Hp { cur: number; max: number; temp: number }

const modOf = (score: number) => Math.floor(((score ?? 10) - 10) / 2);
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

const crToNumber = (cr?: string | null) => {
  if (!cr) return 0;
  if (cr.includes('/')) { const [a, b] = cr.split('/').map(Number); return b ? a / b : 0; }
  return Number(cr) || 0;
};

const abilitiesOf = (d: any) =>
  ABILITY_SCORES.map((a) => ({ key: a.key, label: a.label, score: d[a.key] ?? 10, mod: modOf(d[a.key] ?? 10) }));

const KIND_LABEL: Record<string, string> = { character: 'Character', npc: 'NPC', map: 'Location', item: 'Item', art: 'Art' };

const hrefFor = (t: Target) =>
  t.kind === 'character' ? `/dashboard/characters/${t.id}`
  : t.kind === 'npc' ? `/dashboard/npcs/${t.id}`
  : `/dashboard/items/${t.id}`;

const cache = new Map<string, Promise<Entity>>();

function loadEntity(t: Target): Promise<Entity> {
  const key = `${t.kind}:${t.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = { id: t.id, kind: t.kind, icon: kindIcon(t.kind) ?? '📌', kindLabel: KIND_LABEL[t.kind] ?? t.kind, href: hrefFor(t) };
  const p: Promise<Entity> = (t.kind === 'character' ? getCharacter(t.id) : getItem(t.id)).then((r): Entity => {
    const d = r.data;
    if (t.kind === 'character') {
      return {
        ...base,
        name: d.name,
        subtitle: [`Level ${d.level}`, d.race, (d.classes ?? []).join(' / ')].filter(Boolean).join(' · '),
        image: d.profile_image?.url ?? null,
        ownerId: d.user_id,
        campaignId: d.campaign_id,
        hp: { cur: d.current_hp, max: d.max_hp, temp: d.temp_hp ?? 0 },
        stats: [{ label: 'AC', value: d.armor_class }, { label: 'HP', value: `${d.current_hp}/${d.max_hp}` }],
        ...(() => {
          const pb: number = d.proficiency_bonus ?? 2;
          const owned: string[] = (d.skills ?? []).map((x: string) => x.toLowerCase());
          const abilities = abilitiesOf(d);
          const mods = Object.fromEntries(abilities.map((a) => [a.key, a.mod]));
          const skills = DND_SKILLS.map((sk) => {
            const proficient = owned.includes(sk.name.toLowerCase());
            return { name: sk.name, bonus: mods[sk.ability] + (proficient ? pb : 0), proficient };
          });
          const perception = skills.find((x) => x.name === 'Perception')!.bonus;
          return {
            abilities,
            proficiency: pb,
            skills,
            derived: [
              { label: 'Initiative', value: signed(mods.dexterity) },
              { label: 'Passive Perception', value: 10 + perception },
            ],
          };
        })(),
      };
    }
    const stats: Entity['stats'] = [];
    if (t.kind === 'npc') {
      stats.push({ label: 'AC', value: d.armor_class }, { label: 'HP', value: `${d.current_hp}/${d.max_hp}` });
      if (d.challenge_rating) stats.push({ label: 'CR', value: d.challenge_rating });
    }
    return {
      ...base,
      name: d.name,
      subtitle: t.kind === 'npc' ? d.disposition : (d.categories ?? []).join(' · '),
      image: d.image_url ?? null,
      stats,
      notes: d.notes,
      ownerId: d.user_id,
      campaignId: d.campaign_id,
      ...(t.kind === 'npc' ? { hp: { cur: d.current_hp, max: d.max_hp, temp: d.temp_hp ?? 0 } } : {}),
      ...(t.kind === 'npc'
        ? (() => {
            const cr = crToNumber(d.challenge_rating);
            const abilities = abilitiesOf(d);
            const sb = statblockFrom(d);
            const sections = [
              { title: 'Actions', entries: sb.actions, open: true },
              { title: 'Bonus Actions', entries: sb.bonus_actions, open: true },
              { title: 'Reactions', entries: sb.reactions, open: true },
              { title: 'Legendary Actions', entries: sb.legendary_actions },
              { title: 'Traits', entries: sb.traits },
            ].filter((x) => x.entries.length);
            const pb = 2 + Math.floor((Math.max(cr, 1) - 1) / 4);
            const mods = Object.fromEntries(abilities.map((a) => [a.key, a.mod]));
            const owned: string[] = (d.skills ?? []).map((x: string) => x.toLowerCase());
            const skills = DND_SKILLS.map((sk) => {
              const proficient = owned.includes(sk.name.toLowerCase());
              return { name: sk.name, bonus: mods[sk.ability] + (proficient ? pb : 0), proficient };
            });
            const perception = skills.find((x) => x.name === 'Perception')!.bonus;
            const castMod = sb.spellcasting.ability ? mods[sb.spellcasting.ability] : undefined;
            const levelsPresent = Array.from(new Set(sb.spells.map((x) => Number(x.level) || 0))).sort((x, y) => x - y);
            const info = [
              { label: 'Speed', value: sb.speed },
              { label: 'Senses', value: sb.senses },
              { label: 'Languages', value: sb.languages },
              { label: 'Defenses', value: sb.defenses },
            ].filter((x) => x.value);
            return {
              abilities,
              proficiency: pb,
              skills,
              calc: { mods, pb, skills: d.skills ?? [] },
              info,
              equipment: sb.equipment,
              spellbook: sb.spells.length || sb.spellcasting.ability
                ? {
                    ability: sb.spellcasting.ability ? ABILITY_SCORES.find((a) => a.key === sb.spellcasting.ability)?.label : undefined,
                    dc: castMod === undefined ? undefined : 8 + pb + castMod,
                    attack: castMod === undefined ? undefined : pb + castMod,
                    slots: Object.entries(sb.spellcasting.slots ?? {})
                      .filter(([, n]) => Number(n) > 0)
                      .sort(([x], [y]) => Number(x) - Number(y))
                      .map(([k, n]) => [k, Number(n)] as [string, number]),
                    levels: levelsPresent.map((level) => ({ level, spells: sb.spells.filter((x) => (Number(x.level) || 0) === level) })),
                  }
                : undefined,
              derived: [
                { label: 'Initiative', value: signed(abilities[1].mod) },
                { label: 'Passive Perception', value: 10 + perception },
              ],
              sections,
            };
          })()
        : {}),
    };
  });
  // Don't cache failures — a retry on the next hover should be possible.
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  return p;
}

const targetOf = (el: Element | null): { el: HTMLElement; t: Target } | null => {
  const node = el?.closest?.('[data-kind][data-id]') as HTMLElement | null;
  if (!node) return null;
  const kind = node.dataset.kind!;
  if (!KIND_LABEL[kind]) return null;
  return { el: node, t: { id: node.dataset.id!, kind, label: node.dataset.label ?? node.textContent ?? '' } };
};

interface Props {
  rootRef: RefObject<HTMLElement | null>;
  /** In run mode a click on a tag opens the side panel directly. */
  run: boolean;
}

// Hover card + side panel for tagged campaign objects. Listens by delegation
// on the notebook root so it covers editor chips, run-mode HTML and NPC chips.
export default function EntityLayer({ rootRef, run }: Props) {
  const [hover, setHover] = useState<{ t: Target; x: number; y: number; above: boolean } | null>(null);
  const [panel, setPanel] = useState<Target | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openPanel = useCallback((t: Target) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHover(null);
    setPanel(t);
    // Next frame, so the panel mounts off-screen first and the slide-in animates.
    requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)));
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPanel(null), 260);
  }, []);

  const cancelHide = () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  const scheduleHide = () => { cancelHide(); hideTimer.current = setTimeout(() => setHover(null), 180); };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const over = (e: MouseEvent) => {
      const hit = targetOf(e.target as Element);
      if (!hit) return;
      cancelHide();
      const r = hit.el.getBoundingClientRect();
      const above = r.bottom + 190 > window.innerHeight;
      setHover({ t: hit.t, x: Math.max(8, Math.min(r.left, window.innerWidth - 300)), y: above ? r.top - 6 : r.bottom + 6, above });
    };
    const out = (e: MouseEvent) => { if (targetOf(e.target as Element)) scheduleHide(); };
    const click = (e: MouseEvent) => {
      if (!run) return;
      const hit = targetOf(e.target as Element);
      if (!hit) return;
      e.preventDefault();
      openPanel(hit.t);
    };
    root.addEventListener('mouseover', over);
    root.addEventListener('mouseout', out);
    root.addEventListener('click', click);
    return () => {
      root.removeEventListener('mouseover', over);
      root.removeEventListener('mouseout', out);
      root.removeEventListener('click', click);
      cancelHide();
    };
  }, [rootRef, run, openPanel]);

  // Esc or a click anywhere outside the drawer closes it. Clicking another tag
  // is left to the tag's own handler so the drawer swaps instead of flickering.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    const onDown = (e: MouseEvent) => {
      const el = e.target as Element;
      if (panelRef.current?.contains(el) || el.closest('[data-kind][data-id]')) return;
      closePanel();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [panelOpen, closePanel]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Render above everything: portal out of the notebook's stacking context
  // (into the theatre root when inside it, so its theme variables still apply).
  const host = rootRef.current?.closest('.theatre') ?? document.body;

  return createPortal(
    <div className="nb nb-layer">
      {hover && (
        <div
          className="nb-hovercard"
          style={{ left: hover.x, top: hover.y, transform: hover.above ? 'translateY(-100%)' : undefined }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          <EntityBody t={hover.t} compact onQuickView={() => openPanel(hover.t)} />
        </div>
      )}
      {panel && (
        <aside ref={panelRef} className={`nb-sidepanel ${panelOpen ? 'is-open' : ''}`} aria-label="Details" aria-hidden={!panelOpen}>
          <button type="button" className="nb-btn nb-btn--ghost nb-sidepanel-close" aria-label="Close details" onClick={closePanel}>✕</button>
          <EntityBody t={panel} />
        </aside>
      )}
    </div>,
    host
  );
}

interface RollLog {
  id: number;
  label: string;
  total: number;
  detail: string;
  /** The physical dice shown on the table. A dropped die is the one discarded by adv/dis. */
  dice: { value: number; sides: number; dropped?: boolean }[];
  /** True for d20 rolls (attack / check), the only ones that can crit. */
  d20: boolean;
  /** Die size actually rolled (20 or 100) — drives the flicker animation. */
  sides?: number;
}

let rollSeq = 0;

/** Outline + inner edges + number baseline for each die, so a d6 looks like a d6. */
const DIE_SHAPES: Record<number, { body: string; edges: string; y: number }> = {
  4: { body: 'M50 6 L95 88 L5 88 Z', edges: 'M50 6 L50 88 M5 88 L50 60 L95 88', y: 74 },
  6: { body: 'M16 10 H84 Q92 10 92 18 V82 Q92 90 84 90 H16 Q8 90 8 82 V18 Q8 10 16 10 Z', edges: 'M8 28 H92', y: 66 },
  8: { body: 'M50 4 L94 50 L50 96 L6 50 Z', edges: 'M50 4 L28 50 L50 96 M50 4 L72 50 L50 96 M6 50 H94', y: 57 },
  10: { body: 'M50 3 L93 38 L50 97 L7 38 Z', edges: 'M7 38 L50 50 L93 38 M50 50 V97', y: 36 },
  12: { body: 'M50 4 L95 37 L78 92 L22 92 L5 37 Z', edges: 'M50 4 V30 M95 37 L70 48 M5 37 L30 48 M78 92 L62 66 M22 92 L38 66 M30 48 L38 66 H62 L70 48 L50 30 Z', y: 59 },
  20: { body: 'M50 3 L91 26 L91 74 L50 97 L9 74 L9 26 Z', edges: 'M50 17 L50 3 M50 17 L9 26 M50 17 L91 26 M80 68 L91 74 M80 68 L91 26 M80 68 L50 97 M20 68 L9 74 M20 68 L9 26 M20 68 L50 97', y: 57 },
};
// d100 is two d10s in real life — draw it as the d10 kite.
const shapeFor = (sides: number) => DIE_SHAPES[sides === 100 ? 10 : sides] ?? DIE_SHAPES[20];

function Die({ value, sides, rolling, dropped, crit }: { value: number; sides: number; rolling: boolean; dropped?: boolean; crit?: 'nat20' | 'nat1' | null }) {
  const shape = shapeFor(sides);
  return (
    <div className={`nb-d20 nb-die-d${sides} ${rolling ? 'is-rolling' : 'is-settled'} ${dropped ? 'is-dropped' : ''} ${crit ? `is-${crit}` : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={shape.body} className="nb-d20-body" />
        {sides === 20 && <path d="M50 17 L80 68 L20 68 Z" className="nb-d20-face" />}
        <path d={shape.edges} className="nb-d20-edge" />
        <text x="50" y={shape.y} textAnchor="middle" className="nb-d20-num" style={{ fontSize: value >= 100 ? 17 : value >= 10 ? 24 : 28 }}>{value}</text>
      </svg>
      <small className="nb-die-cap">d{sides}</small>
    </div>
  );
}

// The stage for the latest roll: dice tumble and flicker through random faces,
// then settle on the real result. Nat 20 / nat 1 get their own treatment.
function RollStage({ roll }: { roll: RollLog }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [rolling, setRolling] = useState(!reduce);
  const [faces, setFaces] = useState<number[]>(() => roll.dice.map((d) => d.value));
  const shownDice = roll.dice.slice(0, 12);

  useEffect(() => {
    if (reduce) { setRolling(false); setFaces(roll.dice.map((d) => d.value)); return; }
    setRolling(true);
    const tick = setInterval(() => setFaces(roll.dice.map((d) => 1 + Math.floor(Math.random() * d.sides))), 60);
    const done = setTimeout(() => {
      clearInterval(tick);
      setFaces(roll.dice.map((d) => d.value));
      setRolling(false);
    }, 750);
    return () => { clearInterval(tick); clearTimeout(done); };
  }, [roll.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const kept = roll.dice.find((d) => !d.dropped);
  const crit = roll.d20 && kept && kept.sides === 20 ? (kept.value === 20 ? 'nat20' : kept.value === 1 ? 'nat1' : null) : null;
  const shownCrit = !rolling ? crit : null;

  return (
    <div className={`nb-rollstage ${shownCrit ? `is-${shownCrit}` : ''}`} aria-live="polite">
      {shownDice.length > 0 && (
        <div className={`nb-rollstage-dice ${shownDice.length > 3 ? 'is-many' : ''}`}>
          {shownDice.map((d, i) => (
            <Die key={`${roll.id}-${i}`} sides={d.sides} value={faces[i] ?? d.value} rolling={rolling} dropped={!rolling && d.dropped} crit={!d.dropped ? shownCrit : null} />
          ))}
          {roll.dice.length > shownDice.length && <span className="nb-dice-more">+{roll.dice.length - shownDice.length}</span>}
        </div>
      )}
      <div className={`nb-rollstage-result ${rolling ? 'is-hidden' : ''}`}>
        <strong>{roll.total}</strong>
        <span>{roll.label}</span>
        <small>{roll.detail}</small>
        {shownCrit === 'nat20' && <b className="nb-crit nb-crit--good">Natural 20!</b>}
        {shownCrit === 'nat1' && <b className="nb-crit nb-crit--bad">Natural 1…</b>}
      </div>
    </div>
  );
}
type Mode = 'normal' | 'adv' | 'dis';

const d20 = () => 1 + Math.floor(Math.random() * 20);

// Text with dice made clickable: "+5 to hit" rolls an attack, "(2d6 + 3)" rolls damage.
function RollableText({ text, onRoll }: { text: string; onRoll: (label: string, kind: 'attack' | 'damage' | 'custom', expr: string) => void }) {
  const parts: React.ReactNode[] = [];
  const re = /([+-]\d+) to hit|\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(<button key={i++} type="button" className="nb-roll-inline" title="Roll attack" onClick={() => onRoll('Attack', 'attack', m![1])}>{m[0]}</button>);
    } else {
      parts.push(<button key={i++} type="button" className="nb-roll-inline" title="Roll damage" onClick={() => onRoll('Damage', 'damage', m![2])}>{m[0]}</button>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function FeatureRow({ f, owner, calc, onAttack, onRoll, onRollAll }: {
  f: Feature;
  owner: string;
  calc?: { mods: Record<string, number>; pb: number; skills: string[] };
  onAttack: (label: string, bonus: number, sides?: number) => void;
  onRoll: (label: string, kind: 'attack' | 'damage' | 'custom', expr: string) => void;
  onRollAll: (label: string, parts: { expr: string; type?: string }[]) => void;
}) {
  const computed = attackBonusOf(f, calc?.mods ?? {}, calc?.pb ?? 2);
  const hasAttack = computed !== null && !Number.isNaN(computed);
  const check = checkOf(f, calc?.mods ?? {}, calc?.pb ?? 2, calc?.skills ?? []);
  const custom = customRollOf(f);
  const dmgs = damageRollsOf(f, calc?.mods ?? {});
  const saveText = saveTextOf(f, calc?.mods ?? {}, calc?.pb ?? 2);
  const bonus = computed ?? 0;
  const sides = attackDieOf(f);
  // One-line digest for the closed row, so the rolls can stay tucked away.
  const digest = [
    hasAttack ? `${signed(bonus)} to hit` : null,
    check ? `${check.label} ${signed(check.bonus)}` : null,
    custom ? `Roll ${custom.expr}` : null,
    dmgs.length ? dmgs.map((d) => `${d.expr}${d.type ? ` ${d.type}` : ''}`).join(' + ') : null,
    saveText ? `Save ${saveText}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <details className="nb-feat nb-feat-acc">
      <summary>
        <span className="nb-feat-caret" aria-hidden="true">▸</span>
        <strong>{f.name}</strong>
        {f.uses && <span className="nb-feat-uses">{f.uses}</span>}
        {digest && <span className="nb-feat-digest">{digest}</span>}
      </summary>
      <div className="nb-feat-body">
      {f.range && <small className="nb-feat-range">{f.range}</small>}
      {(hasAttack || check || custom || dmgs.length > 0 || saveText) && (
        <div className="nb-feat-rolls">
          {hasAttack && (
            <button type="button" className="nb-roll-inline" title="Roll attack" onClick={() => onAttack(`${owner} ${f.name} · attack`, bonus, sides)}>
              {signed(bonus)} to hit{sides === 100 ? ' · d100' : ''}
            </button>
          )}
          {check && (
            <button type="button" className="nb-roll-inline" title={`Roll ${check.label}`} onClick={() => onAttack(`${owner} ${f.name} · ${check.label}`, check.bonus, attackDieOf(f))}>
              {check.label} {signed(check.bonus)}{attackDieOf(f) === 100 ? ' · d100' : ''}
            </button>
          )}
          {custom && (
            <button type="button" className="nb-roll-inline" title="Roll" onClick={() => onRoll(`${owner} ${f.name} · ${custom.label}`, 'custom', custom.expr)}>
              Roll {custom.expr}{custom.label !== custom.expr ? ` · ${custom.label}` : ''}
            </button>
          )}
          {dmgs.map((d, k) => (
            <button key={k} type="button" className="nb-roll-inline" title={`Roll ${d.type ?? ''} damage`} onClick={() => onRoll(`${owner} ${f.name}${d.type ? ` · ${d.type}` : ''}`, 'damage', d.expr)}>
              {/^\d+$/.test(d.expr) ? `${d.expr} damage` : d.expr}{d.type ? ` ${d.type}` : ''}
            </button>
          ))}
          {dmgs.length > 1 && (
            <button type="button" className="nb-roll-inline nb-roll-inline--all" title="Roll every damage type together" onClick={() => onRollAll(`${owner} ${f.name}`, dmgs)}>
              Roll all damage
            </button>
          )}
          {saveText && <span className="nb-feat-save">Save: {saveText}</span>}
        </div>
      )}
      {f.desc && <p><RollableText text={f.desc} onRoll={onRoll} /></p>}
      {!digest && !f.desc && <small className="nb-feat-range">No rolls or details.</small>}
      </div>
    </details>
  );
}

const hpTone = (h: Hp) => {
  const r = h.max ? h.cur / h.max : 0;
  return r > 0.5 ? 'good' : r > 0.25 ? 'warn' : 'bad';
};

// Max (permanent) / current (active) / temp HP. Temp HP soaks damage first and
// doesn't stack — a new grant only replaces the old one if it's bigger.
function HpTracker({ hp, canEdit, onChange }: { hp: Hp; canEdit: boolean; onChange: (next: Hp) => void }) {
  const [amount, setAmount] = useState('');
  const n = Math.max(0, parseInt(amount, 10) || 0);
  const total = Math.max(hp.max, hp.cur + hp.temp, 1);

  const apply = (next: Hp) => { onChange(next); setAmount(''); };
  const damage = () => {
    if (!n) return;
    const soaked = Math.min(hp.temp, n);
    apply({ ...hp, temp: hp.temp - soaked, cur: Math.max(0, hp.cur - (n - soaked)) });
  };
  const heal = () => n && apply({ ...hp, cur: Math.min(hp.max, hp.cur + n) });
  const temp = () => n && apply({ ...hp, temp: Math.max(hp.temp, n) });
  const submitOnEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); damage(); } };

  return (
    <div className={`nb-hp ${hp.cur === 0 ? 'is-down' : ''}`}>
      <div className="nb-hp-top">
        <span className="nb-ent-h">Hit points</span>
        <span className="nb-hp-read">
          <strong>{hp.cur}</strong> / {hp.max}
          {hp.temp > 0 && <em className="nb-hp-temp"> +{hp.temp} temp</em>}
        </span>
      </div>
      <div className="nb-hp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={hp.max} aria-valuenow={hp.cur} aria-label="Hit points">
        <div className={`nb-hp-fill is-${hpTone(hp)}`} style={{ width: `${(hp.cur / total) * 100}%` }} />
        <div className="nb-hp-tempfill" style={{ width: `${(hp.temp / total) * 100}%` }} />
      </div>
      {hp.cur === 0 && <div className="nb-note">Down — at 0 HP.</div>}
      {canEdit ? (
        <>
          <div className="nb-hp-controls">
            <input
              className="nb-input nb-hp-amount" type="number" min={0} placeholder="Amount" aria-label="HP amount"
              value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={submitOnEnter}
            />
            <button type="button" className="nb-btn nb-btn--sm nb-hp-dmg" disabled={!n} onClick={damage}>Damage</button>
            <button type="button" className="nb-btn nb-btn--sm nb-hp-heal" disabled={!n} onClick={heal}>Heal</button>
            <button type="button" className="nb-btn nb-btn--sm nb-hp-tmp" disabled={!n} onClick={temp} title="Temp HP doesn't stack; keeps the higher value">+ Temp</button>
          </div>
          <div className="nb-hp-adjust">
            <label>Max <input className="nb-input" type="number" min={1} value={hp.max} aria-label="Max HP"
              onChange={(e) => { const m = Math.max(1, parseInt(e.target.value, 10) || 1); onChange({ ...hp, max: m, cur: Math.min(hp.cur, m) }); }} /></label>
            <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" onClick={() => onChange({ ...hp, cur: hp.max })}>Full heal</button>
            {hp.temp > 0 && <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" onClick={() => onChange({ ...hp, temp: 0 })}>Clear temp</button>}
          </div>
        </>
      ) : (
        <div className="nb-note">Only {`its owner`} can change HP.</div>
      )}
    </div>
  );
}

function EntityBody({ t, compact, onQuickView }: { t: Target; compact?: boolean; onQuickView?: () => void }) {
  const [ent, setEnt] = useState<Entity | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>('normal');
  const [log, setLog] = useState<RollLog[]>([]);
  const { user } = useAuth();
  const { tracks: campaignTracks } = useCampaignTracks(ent?.campaignId ?? undefined);
  const themeTracks = campaignTracks.filter((tr) => tr.refs.some((r) => r.id === t.id));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const changeHp = (hp: Hp) => {
    if (!ent) return;
    const next = { ...ent, hp, stats: ent.stats.map((x) => (x.label === 'HP' ? { ...x, value: `${hp.cur}/${hp.max}` } : x)) };
    setEnt(next);
    cache.set(`${t.kind}:${t.id}`, Promise.resolve(next));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const body = { current_hp: hp.cur, max_hp: hp.max, temp_hp: hp.temp };
      (t.kind === 'character' ? updateCharacter(t.id, body) : updateItem(t.id, body)).catch(() => setHpError(true));
    }, 350);
    setHpError(false);
  };
  const [hpError, setHpError] = useState(false);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const load = useCallback(() => {
    setEnt(null);
    setFailed(false);
    setLog([]);
    loadEntity(t).then(setEnt).catch(() => setFailed(true));
  }, [t.id, t.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const push = (r: Omit<RollLog, 'id'>) => setLog((l) => [{ ...r, id: ++rollSeq }, ...l].slice(0, 4));

  const rollD20 = (label: string, bonus: number, sides = 20) => {
    const die = () => 1 + Math.floor(Math.random() * sides);
    const a = die();
    const b = mode === 'normal' ? null : die();
    const keepFirst = b === null || (mode === 'adv' ? a >= b : a <= b);
    const kept = keepFirst ? a : (b as number);
    push({
      label: `${label}${mode === 'adv' ? ' (adv)' : mode === 'dis' ? ' (dis)' : ''}`,
      total: kept + bonus,
      detail: `d${sides} [${b === null ? a : `${a}, ${b}`}] ${signed(bonus)}`,
      dice: b === null ? [{ value: a, sides }] : [{ value: a, sides, dropped: !keepFirst }, { value: b, sides, dropped: keepFirst }],
      d20: sides === 20,
      sides,
    });
  };

  const rollInline = (label: string, kind: 'attack' | 'damage' | 'custom', expr: string) => {
    if (kind === 'attack') { rollD20(`${ent?.name ?? t.label} · attack`, parseInt(expr, 10)); return; }
    const r = rollExpression(expr);
    const who = label && label !== 'Damage' && label !== 'Attack' ? label : (ent?.name ?? t.label);
    if (r) push({ label: kind === 'custom' ? who : `${who} · damage`, total: r.total, detail: r.detail, dice: r.dice ?? [], d20: false });
  };

  // Several damage types at once: roll each, show the sum with a per-type breakdown.
  const rollAll = (label: string, parts: { expr: string; type?: string }[]) => {
    const rolled = parts.map((p) => ({ p, r: rollExpression(p.expr) })).filter((x) => x.r);
    if (!rolled.length) return;
    push({
      label: `${label} · all damage`,
      total: rolled.reduce((n, x) => n + x.r!.total, 0),
      detail: rolled.map((x) => `${x.r!.total}${x.p.type ? ` ${x.p.type}` : ''}`).join(' + '),
      dice: rolled.flatMap((x) => x.r!.dice ?? []),
      d20: false,
    });
  };

  const icon = kindIcon(t.kind) ?? '📌';
  const href = hrefFor(t);

  return (
    <div className={compact ? 'nb-ent nb-ent--compact' : 'nb-ent'}>
      <div className="nb-ent-head">
        {ent?.image && !compact && <img className="nb-ent-img" src={ent.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <div className="nb-ent-title">
          <span className="nb-ent-kind">{icon} {KIND_LABEL[t.kind]}</span>
          <strong>{ent?.name ?? t.label}</strong>
          {ent?.subtitle && <span className="nb-ent-sub">{ent.subtitle}</span>}
        </div>
      </div>
      {!ent && !failed && <div className="nb-note">Loading…</div>}
      {failed && <div className="nb-note">Couldn’t load details. <button type="button" className="nb-link" onClick={load}>Retry</button></div>}
      {ent && (ent.stats.length > 0 || (!compact && ent.proficiency)) && (
        <div className="nb-ent-stats">
          {ent.stats.filter((x) => compact || !ent.hp || x.label !== 'HP').map((s) => <span key={s.label}><em>{s.label}</em> {s.value}</span>)}
          {!compact && ent.proficiency ? <span><em>PROF</em> {signed(ent.proficiency)}</span> : null}
          {!compact && ent.derived?.map((s) => <span key={s.label}><em>{s.label.toUpperCase()}</em> {s.value}</span>)}
        </div>
      )}

      {!compact && ent?.info && ent.info.length > 0 && (
        <dl className="nb-info">
          {ent.info.map((x) => (<div key={x.label}><dt>{x.label}</dt><dd>{x.value}</dd></div>))}
        </dl>
      )}

      {!compact && ent?.hp && (
        <>
          <HpTracker hp={ent.hp} canEdit={!!user && ent.ownerId === user.id} onChange={changeHp} />
          {hpError && <div className="nb-note" style={{ color: 'var(--color-error, #ef4444)' }}>Couldn’t save HP — changes may be lost.</div>}
        </>
      )}

      {!compact && ent?.abilities && (
        <>
          <div className="nb-ent-rollbar">
            <span className="nb-ent-h">Abilities · click to roll</span>
            <span className="nb-seg" role="group" aria-label="Roll mode">
              {(['dis', 'normal', 'adv'] as Mode[]).map((m) => (
                <button key={m} type="button" className={mode === m ? 'is-on' : ''} onClick={() => setMode(m)}>
                  {m === 'dis' ? 'Dis' : m === 'adv' ? 'Adv' : '—'}
                </button>
              ))}
            </span>
          </div>
          <div className="nb-ent-abilities">
            {ent.abilities.map((a) => (
              <button key={a.key} type="button" className="nb-ability" title={`Roll ${a.label} check`} onClick={() => rollD20(`${a.label} check`, a.mod)}>
                <em>{a.label}</em>
                <strong>{signed(a.mod)}</strong>
                <span>{a.score}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!compact && log.length > 0 && (
        <>
          <RollStage roll={log[0]} />
          {log.length > 1 && (
            <div className="nb-rolllog">
              {log.slice(1).map((r) => (
                <div key={r.id}><strong>{r.total}</strong> <span>{r.label}</span> <small>{r.detail}</small></div>
              ))}
            </div>
          )}
        </>
      )}

      {!compact && ent?.skills && (
        <details key={`${t.id}-skills`} className="nb-acc-item nb-acc-item--solo">
          <summary>
            <span className="nb-acc-label">SKILLS</span>
            <span className="nb-acc-sum">
              {ent.skills.filter((sk) => sk.proficient).length} proficient
            </span>
            <span className="nb-acc-caret" aria-hidden="true">▸</span>
          </summary>
          <div className="nb-ent-skills">
            {[...ent.skills].sort((x, y) => x.name.localeCompare(y.name)).map((sk) => (
              <button key={sk.name} type="button" className={sk.proficient ? 'is-prof' : ''} title={`Roll ${sk.name}`} onClick={() => rollD20(sk.name, sk.bonus)}>
                <span>{sk.proficient ? '●' : '○'} {sk.name}</span> <strong>{signed(sk.bonus)}</strong>
              </button>
            ))}
          </div>
        </details>
      )}

      {!compact && ent?.sections?.map((sec) => (
        <details key={`${t.id}-${sec.title}`} className="nb-acc-item nb-acc-item--solo" open={sec.open}>
          <summary>
            <span className="nb-acc-label">{sec.title.toUpperCase()}</span>
            <span className="nb-acc-sum">{sec.entries.length}</span>
            <span className="nb-acc-caret" aria-hidden="true">▸</span>
          </summary>
          <div className="nb-feats">
            {sec.entries.map((f, i) => (
              <FeatureRow key={i} f={f} owner={ent.name} calc={ent.calc} onAttack={rollD20} onRoll={rollInline} onRollAll={rollAll} />
            ))}
          </div>
        </details>
      ))}

      {!compact && ent?.spellbook && (
        <details key={`${t.id}-spells`} className="nb-acc-item nb-acc-item--solo" open>
          <summary>
            <span className="nb-acc-label">SPELLS</span>
            <span className="nb-acc-sum">
              {ent.spellbook.dc !== undefined ? `${ent.spellbook.ability} · DC ${ent.spellbook.dc} · ${signed(ent.spellbook.attack!)} to hit` : `${ent.spellbook.levels.reduce((n, l) => n + l.spells.length, 0)} known`}
            </span>
            <span className="nb-acc-caret" aria-hidden="true">▸</span>
          </summary>
          <div className="nb-feats">
            {ent.spellbook.attack !== undefined && (
              <button type="button" className="nb-roll-inline" style={{ alignSelf: 'flex-start' }} onClick={() => rollD20(`${ent.name} · spell attack`, ent.spellbook!.attack!)}>
                Spell attack {signed(ent.spellbook.attack)}
              </button>
            )}
            {ent.spellbook.slots.length > 0 && (
              <div className="nb-slots">
                {ent.spellbook.slots.map(([lvl, n]) => (
                  <span key={lvl}><em>L{lvl}</em> {'◆'.repeat(Math.min(n, 9))} <small>{n}</small></span>
                ))}
              </div>
            )}
            {ent.spellbook.levels.map((grp) => (
              <div key={grp.level}>
                <div className="nb-ent-h" style={{ marginTop: 6 }}>{SPELL_LEVEL_LABEL(grp.level)}</div>
                {grp.spells.map((sp, i) => (
                  <div key={i} className="nb-feat">
                    <div className="nb-feat-head">
                      <strong>{sp.name}</strong>
                      {sp.concentration && <span className="nb-feat-uses" title="Concentration">C</span>}
                      {sp.uses && <span className="nb-feat-uses">{sp.uses}</span>}
                    </div>
                    {sp.desc && <p><RollableText text={sp.desc} onRoll={rollInline} /></p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      {!compact && ent?.equipment && ent.equipment.length > 0 && (
        <details key={`${t.id}-gear`} className="nb-acc-item nb-acc-item--solo">
          <summary>
            <span className="nb-acc-label">EQUIPMENT</span>
            <span className="nb-acc-sum">{ent.equipment.length}</span>
            <span className="nb-acc-caret" aria-hidden="true">▸</span>
          </summary>
          <div className="nb-feats">
            {ent.equipment.map((g, i) => (
              <div key={i} className="nb-feat">
                <div className="nb-feat-head"><strong>{g.name}</strong>{Number(g.qty) > 1 && <span className="nb-feat-uses">×{g.qty}</span>}</div>
                {g.desc && <p>{g.desc}</p>}
              </div>
            ))}
          </div>
        </details>
      )}

      {themeTracks.length > 0 && (
        compact ? (
          <div className="nb-note">♫ {themeTracks.length} theme{themeTracks.length > 1 ? 's' : ''}: {themeTracks.map((tr) => tr.title).join(', ')}</div>
        ) : (
          <details key={`${t.id}-music`} className="nb-acc-item nb-acc-item--solo" open>
            <summary>
              <span className="nb-acc-label">THEME MUSIC</span>
              <span className="nb-acc-sum">{themeTracks.length}</span>
              <span className="nb-acc-caret" aria-hidden="true">▸</span>
            </summary>
            <div className="nb-feats">
              {themeTracks.map((tr) => <TrackCard key={tr.id} track={tr} />)}
            </div>
          </details>
        )
      )}

      {ent?.notes && (
        <div className={`nb-html nb-ent-notes ${compact ? 'is-clamped' : ''}`} dangerouslySetInnerHTML={{ __html: renderNotes(ent.notes) }} />
      )}
      {ent && !ent.notes && !ent.stats.length && !ent.abilities && <div className="nb-note">No notes yet.</div>}
      <div className="nb-ent-actions">
        {onQuickView && <button type="button" className="nb-btn nb-btn--sm" onClick={onQuickView}>Quick view</button>}
        <a className="nb-btn nb-btn--sm nb-btn--primary" href={href} target="_blank" rel="noopener noreferrer">Edit ↗</a>
      </div>
    </div>
  );
}
