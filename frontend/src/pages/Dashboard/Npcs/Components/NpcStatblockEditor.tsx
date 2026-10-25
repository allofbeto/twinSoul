import { Fragment, useState, type ReactNode } from 'react';
import { ABILITY_SCORES, DND_SKILLS } from '../../Characters/constants';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '../../../../components/sessionNotebook/Icons';
import {
  attackBonusOf, checkOf, customRollOf, damageRollsOf, damagesOf, damageTextOf, modOfScore, proficiencyForCr, rollKindOf, saveTextOf,
  type Damage, type Feature, type GearItem, type Spell, type StatblockFields,
} from '../statblock';

interface Props {
  value: StatblockFields;
  onChange: (patch: Partial<StatblockFields>) => void;
  isOwner: boolean;
  /** Ability scores + CR, so rolls can be previewed from stat modifiers. */
  scores: Record<string, number | undefined>;
  challengeRating?: string | null;
  /** Proficient skill names, so skill-check actions can show the real bonus. */
  skills?: string[];
  /** Render just one part of the stat block (the builder shows them on separate tabs). */
  show?: 'details' | 'combat' | 'magic';
  /** No outer card / heading — the caller supplies the chrome. */
  bare?: boolean;
}

type ListKey = 'traits' | 'actions' | 'bonus_actions' | 'reactions' | 'legendary_actions';

const FEATURE_SECTIONS: { key: ListKey; title: string; noun: string; hint: string; rolls: boolean }[] = [
  { key: 'actions', title: 'Actions', noun: 'action', hint: 'Anything this NPC can do on its turn or in a scene — attacks, checks, special abilities.', rolls: true },
  { key: 'bonus_actions', title: 'Bonus Actions', noun: 'bonus action', hint: 'Quick abilities — one per turn.', rolls: true },
  { key: 'reactions', title: 'Reactions', noun: 'reaction', hint: 'Triggered off-turn, once per round.', rolls: true },
  { key: 'legendary_actions', title: 'Legendary Actions', noun: 'legendary action', hint: 'Taken at the end of other creatures’ turns.', rolls: true },
  { key: 'traits', title: 'Traits', noun: 'trait', hint: 'Passive features (Pack Tactics, Magic Resistance…).', rolls: false },
];

const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const DICE = [4, 6, 8, 10, 12, 20, 100];
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const n = arr.slice();
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};

/* ---------- small building blocks ---------- */

function Section({ title, count, hint, children, defaultOpen }: { title: string; count: number; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="sbe-section" open={defaultOpen || count > 0}>
      <summary>
        <span>{title}</span>
        <span className="sbe-count">{count || 'none'}</span>
      </summary>
      {hint && <p className="sbe-hint">{hint}</p>}
      {children}
    </details>
  );
}

function Seg<T extends string>({ value, options, onChange, disabled, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; label: string }) {
  return (
    <div className="sbe-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" disabled={disabled} aria-pressed={value === o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="sbe-row">
    <div className="sbe-row-label">{label}</div>
    <div className="sbe-row-body">{children}</div>
  </div>
);

function Tools({ i, len, onMove, onRemove, disabled }: { i: number; len: number; onMove: (d: number) => void; onRemove: () => void; disabled: boolean }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="sbe-tools">
      <button type="button" className="sbe-icon" disabled={disabled || i === 0} onClick={() => onMove(-1)} aria-label="Move up" title="Move up"><ChevronUpIcon /></button>
      <button type="button" className="sbe-icon" disabled={disabled || i === len - 1} onClick={() => onMove(1)} aria-label="Move down" title="Move down"><ChevronDownIcon /></button>
      <button type="button" className={`sbe-icon sbe-icon--trash ${confirm ? 'is-confirm' : ''}`} disabled={disabled} aria-label="Delete" title="Delete"
        onClick={() => (confirm ? onRemove() : setConfirm(true))} onBlur={() => setConfirm(false)}>
        {confirm ? <span>Delete?</span> : <TrashIcon />}
      </button>
    </div>
  );
}

/* ---------- editor ---------- */

const NpcStatblockEditor = ({ value, onChange, isOwner, scores, challengeRating, skills, show, bare }: Props) => {
  const off = !isOwner;
  // Which action cards are expanded, keyed `${section}:${index}`. Kept here (not in a child
  // component) so cards survive the re-render on every keystroke.
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const want = (part: 'details' | 'combat' | 'magic') => !show || show === part;
  const pb = proficiencyForCr(challengeRating);
  const mods: Record<string, number> = Object.fromEntries(ABILITY_SCORES.map((a) => [a.key, modOfScore(scores[a.key])]));
  const owned = skills ?? [];

  const abilityOptions = (blank: string) => (
    <>
      <option value="">{blank}</option>
      {ABILITY_SCORES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
    </>
  );

  /** One-line digest shown on a collapsed action card. */
  const summarize = (f: Feature, rolls: boolean) => {
    const chips: string[] = [];
    if (rolls) {
      const kind = rollKindOf(f);
      if (kind === 'attack') { const b = attackBonusOf(f, mods, pb); if (b !== null) chips.push(`${signed(b)} to hit`); }
      if (kind === 'check') { const c = checkOf(f, mods, pb, owned); if (c) chips.push(`${c.label} ${signed(c.bonus)}`); }
      if (kind === 'custom') { const c = customRollOf(f); if (c) chips.push(`Roll ${c.expr}`); }
      const dmg = damageTextOf(f, mods);
      if (dmg) chips.push(dmg);
      const sv = saveTextOf(f, mods, pb);
      if (sv) chips.push(`Save ${sv}`);
    }
    if (f.uses) chips.push(f.uses);
    return chips;
  };

  const renderFeature = ({ f, i, list, set, rolls, secKey }: { f: Feature; i: number; list: Feature[]; set: (n: Feature[]) => void; rolls: boolean; secKey: string }) => {
    const openKey = `${secKey}:${i}`;
    const open = openKeys.has(openKey);
    const setOpen = (v: boolean) => setOpenKeys((prev) => { const n = new Set(prev); if (v) n.add(openKey); else n.delete(openKey); return n; });
    const patch = (p: Partial<Feature>) => set(list.map((x, k) => (k === i ? { ...x, ...p } : x)));
    const kind = rollKindOf(f);
    const comps = damagesOf(f);
    const setComps = (next: Damage[]) => patch({ damages: next });
    const patchComp = (k: number, p: Partial<Damage>) => setComps(comps.map((c, j) => (j === k ? { ...c, ...p } : c)));
    const hasSave = !!f.save_ability;
    const chips = summarize(f, rolls);
    const attackPreview = attackBonusOf(f, mods, pb);
    const check = checkOf(f, mods, pb, owned);
    const compPreview = (c: Damage) => {
      const r = damageRollsOf({ name: '', damages: [c] }, mods)[0];
      return r ? `${r.expr}${r.type ? ` ${r.type}` : ''}` : '';
    };
    const saveText = saveTextOf(f, mods, pb);

    return (
      <div className={`sbe-card ${open ? 'is-open' : ''}`}>
        <div className="sbe-card-head">
          <button type="button" className="sbe-caret" aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(!open)}>▸</button>
          <input className="sbe-name" placeholder="Name (e.g. Scimitar)" value={f.name} disabled={off} aria-label="Name" onChange={(e) => patch({ name: e.target.value })} />
          {!open && chips.length > 0 && <div className="sbe-chips">{chips.map((c, k) => <span key={k}>{c}</span>)}</div>}
          <Tools i={i} len={list.length} disabled={off} onMove={(d) => set(move(list, i, d))} onRemove={() => set(list.filter((_, k) => k !== i))} />
        </div>

        {open && (
          <div className="sbe-body">
            {rolls && (
              <>
                {/* ① Roll */}
                <Row label="Roll">
                  <Seg label="What this action rolls" disabled={off} value={kind}
                    options={[{ value: '', label: 'None' }, { value: 'attack', label: 'Attack' }, { value: 'check', label: 'Check' }, { value: 'custom', label: 'Custom' }]}
                    onChange={(v) => patch({ roll_kind: v, attack_roll: v === 'attack' })} />
                  {kind === 'attack' && (
                    <div className="sbe-line">
                      <label className="sbe-f"><span>To hit from</span>
                        <select className="sbe-in sbe-w-md" value={f.attack_ability ?? ''} disabled={off} onChange={(e) => patch({ attack_ability: e.target.value || undefined })}>{abilityOptions('Flat number')}</select>
                      </label>
                      {f.attack_ability && (
                        <label className="sbe-check" title={`Proficiency +${pb}, from CR`}>
                          <input type="checkbox" checked={f.attack_proficient !== false} disabled={off} onChange={(e) => patch({ attack_proficient: e.target.checked })} /> Prof {signed(pb)}
                        </label>
                      )}
                      <label className="sbe-f"><span>{f.attack_ability ? 'Extra' : 'Bonus'}</span>
                        <input className="sbe-in sbe-w-xs" type="number" value={f.attack_bonus ?? ''} disabled={off} onChange={(e) => patch({ attack_bonus: e.target.value })} />
                      </label>
                      <label className="sbe-f"><span>Die</span>
                        <select className="sbe-in sbe-w-sm" value={Number(f.attack_die) === 100 ? 100 : 20} disabled={off} onChange={(e) => patch({ attack_die: Number(e.target.value) })}><option value={20}>d20</option><option value={100}>d100</option></select>
                      </label>
                      <label className="sbe-f sbe-grow"><span>Reach / range</span>
                        <input className="sbe-in" placeholder="5 ft. or 80/320 ft." value={f.range ?? ''} disabled={off} onChange={(e) => patch({ range: e.target.value })} />
                      </label>
                      {attackPreview !== null && <span className="sbe-result">{signed(attackPreview)} to hit</span>}
                    </div>
                  )}
                  {kind === 'check' && (
                    <div className="sbe-line">
                      <label className="sbe-f"><span>Check</span>
                        <select className="sbe-in sbe-w-lg" value={f.check_with ?? ''} disabled={off} onChange={(e) => patch({ check_with: e.target.value || undefined })}>
                          <option value="">Choose…</option>
                          <optgroup label="Skills">{[...DND_SKILLS].sort((x, y) => x.name.localeCompare(y.name)).map((sk) => <option key={sk.name} value={`skill:${sk.name}`}>{sk.name}</option>)}</optgroup>
                          <optgroup label="Abilities">{ABILITY_SCORES.map((a) => <option key={a.key} value={`ability:${a.key}`}>{a.label} check</option>)}</optgroup>
                        </select>
                      </label>
                      <label className="sbe-f"><span>Extra</span>
                        <input className="sbe-in sbe-w-xs" type="number" value={f.roll_bonus ?? ''} disabled={off} onChange={(e) => patch({ roll_bonus: e.target.value })} />
                      </label>
                      <label className="sbe-f"><span>Die</span>
                        <select className="sbe-in sbe-w-sm" value={Number(f.attack_die) === 100 ? 100 : 20} disabled={off} onChange={(e) => patch({ attack_die: Number(e.target.value) })}><option value={20}>d20</option><option value={100}>d100</option></select>
                      </label>
                      {check && <span className="sbe-result">{check.label} {signed(check.bonus)}</span>}
                    </div>
                  )}
                  {kind === 'custom' && (
                    <div className="sbe-line">
                      <label className="sbe-f"><span>Dice</span>
                        <input className="sbe-in sbe-w-md" placeholder="1d100" value={f.roll_expr ?? ''} disabled={off} onChange={(e) => patch({ roll_expr: e.target.value })} />
                      </label>
                      <label className="sbe-f sbe-grow"><span>Label</span>
                        <input className="sbe-in" placeholder="Wild magic surge" value={f.roll_label ?? ''} disabled={off} onChange={(e) => patch({ roll_label: e.target.value })} />
                      </label>
                    </div>
                  )}
                </Row>

                {/* ② Damage — one or more components, each with its own type */}
                <Row label="Damage">
                  {comps.length === 0 && (
                    <button type="button" className="sbe-add sbe-add--inline" disabled={off} onClick={() => setComps([{ mode: 'dice', dice_count: 1, dice_sides: 6 }])}>＋ Add damage</button>
                  )}
                  {comps.map((c, k) => (
                    <div key={k} className="sbe-dmg">
                      <div className="sbe-dmg-head">
                        <Seg label={`Damage ${k + 1} kind`} disabled={off} value={c.mode === 'text' ? ('' as 'dice') : c.mode}
                          options={[{ value: 'dice', label: 'Dice' }, { value: 'flat', label: 'Flat' }]}
                          onChange={(v) => patchComp(k, v === 'dice' ? { mode: 'dice', dice_count: c.dice_count ?? 1, dice_sides: c.dice_sides ?? 6 } : { mode: 'flat' })} />
                        <span className="sbe-dmg-n">{comps.length > 1 ? `Damage ${k + 1}` : ''}</span>
                        <button type="button" className="sbe-icon sbe-icon--trash" disabled={off} aria-label={`Remove damage ${k + 1}`} title="Remove this damage" onClick={() => setComps(comps.filter((_, j) => j !== k))}><TrashIcon /></button>
                      </div>
                      <div className="sbe-line">
                        {c.mode === 'dice' && (
                          <>
                            <label className="sbe-f"><span>Dice</span>
                              <span className="sbe-inline">
                                <input className="sbe-in sbe-w-xs" type="number" min={1} value={c.dice_count ?? 1} disabled={off} aria-label="Number of dice" onChange={(e) => patchComp(k, { dice_count: e.target.value })} />
                                <span className="sbe-op">×</span>
                                <select className="sbe-in sbe-w-sm" value={Number(c.dice_sides) || 6} disabled={off} aria-label="Die size" onChange={(e) => patchComp(k, { dice_sides: Number(e.target.value) })}>{DICE.map((d) => <option key={d} value={d}>d{d}</option>)}</select>
                              </span>
                            </label>
                            <label className="sbe-f"><span>+ Ability mod</span>
                              <select className="sbe-in sbe-w-md" value={c.ability ?? ''} disabled={off} onChange={(e) => patchComp(k, { ability: e.target.value || undefined })}>{abilityOptions('None')}</select>
                            </label>
                            <label className="sbe-f"><span>+ Bonus</span>
                              <input className="sbe-in sbe-w-xs" type="number" value={c.bonus ?? ''} disabled={off} onChange={(e) => patchComp(k, { bonus: e.target.value })} />
                            </label>
                          </>
                        )}
                        {c.mode === 'flat' && (
                          <label className="sbe-f"><span>Amount</span>
                            <input className="sbe-in sbe-w-sm" type="number" min={0} value={c.flat ?? ''} disabled={off} onChange={(e) => patchComp(k, { flat: e.target.value })} />
                          </label>
                        )}
                        {c.mode === 'text' && (
                          <label className="sbe-f"><span>Older entry — pick Dice or Flat to rebuild</span>
                            <input className="sbe-in sbe-w-md" value={c.text ?? ''} disabled={off} onChange={(e) => patchComp(k, { text: e.target.value })} />
                          </label>
                        )}
                        <label className="sbe-f"><span>Type</span>
                          <select className="sbe-in sbe-w-md" value={c.type ?? ''} disabled={off} onChange={(e) => patchComp(k, { type: e.target.value })}><option value="">Choose…</option>{DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                        </label>
                        <span className="sbe-result">{compPreview(c)}</span>
                      </div>
                    </div>
                  ))}
                  {comps.length > 0 && (
                    <div className="sbe-line">
                      <button type="button" className="sbe-add sbe-add--inline" disabled={off} onClick={() => setComps([...comps, { mode: 'dice', dice_count: 1, dice_sides: 6 }])}>＋ Add another damage type</button>
                      {comps.length > 1 && <span className="sbe-result">Total: {damageTextOf(f, mods)}</span>}
                    </div>
                  )}
                </Row>

                {/* ③ Save */}
                <Row label="Save">
                  <Seg label="Saving throw" disabled={off} value={hasSave ? 'on' : 'off'}
                    options={[{ value: 'off', label: 'None' }, { value: 'on', label: 'Target saves' }]}
                    onChange={(v) => patch(v === 'on' ? { save_ability: f.save_ability || 'dexterity' } : { save_ability: undefined, save_dc: '', save_dc_ability: undefined, save: '' })} />
                  {!hasSave && f.save && <p className="sbe-note">Older entry “{f.save}”. Turn on “Target saves” to rebuild it.</p>}
                  {hasSave && (
                    <div className="sbe-line">
                      <label className="sbe-f"><span>Save</span>
                        <select className="sbe-in sbe-w-sm" value={f.save_ability ?? ''} disabled={off} onChange={(e) => patch({ save_ability: e.target.value || undefined })}>{abilityOptions('—')}</select>
                      </label>
                      <label className="sbe-f"><span>DC</span>
                        <span className="sbe-inline">
                          <select className="sbe-in sbe-w-lg" value={f.save_dc_ability ?? ''} disabled={off} aria-label="DC source" onChange={(e) => patch({ save_dc_ability: e.target.value || undefined })}>
                            <option value="">Fixed number</option>
                            {ABILITY_SCORES.map((a) => <option key={a.key} value={a.key}>8 + prof + {a.label}</option>)}
                          </select>
                          {!f.save_dc_ability && <input className="sbe-in sbe-w-xs" type="number" placeholder="14" value={f.save_dc ?? ''} disabled={off} aria-label="Save DC" onChange={(e) => patch({ save_dc: e.target.value })} />}
                        </span>
                      </label>
                      {kind !== 'attack' && (
                        <label className="sbe-f sbe-grow"><span>Area / range</span>
                          <input className="sbe-in" placeholder="15-ft. cone" value={f.range ?? ''} disabled={off} onChange={(e) => patch({ range: e.target.value })} />
                        </label>
                      )}
                      {saveText && <span className="sbe-result">{saveText}</span>}
                    </div>
                  )}
                </Row>
              </>
            )}

            <Row label="Uses">
              <input className="sbe-in sbe-w-lg" placeholder="At will · 3/day · Recharge 5–6" value={f.uses ?? ''} disabled={off} aria-label="Uses" onChange={(e) => patch({ uses: e.target.value })} />
            </Row>
            <Row label="Details">
              <textarea className="sbe-in sbe-area" rows={2} placeholder="What it does, when it triggers, DM notes…" value={f.desc ?? ''} disabled={off} onChange={(e) => patch({ desc: e.target.value })} />
            </Row>
          </div>
        )}
      </div>
    );
  };

  const featureList = (sec: typeof FEATURE_SECTIONS[number]) => {
    const list = value[sec.key];
    const set = (next: Feature[]) => onChange({ [sec.key]: next } as Partial<StatblockFields>);
    return (
      <Section key={sec.key} title={sec.title} hint={sec.hint} count={list.length}>
        <div className="sbe-cards">
          {list.map((f, i) => <Fragment key={i}>{renderFeature({ f, i, list, set, rolls: sec.rolls, secKey: sec.key })}</Fragment>)}
        </div>
        {!off && <button type="button" className="sbe-add" onClick={() => { set([...list, { name: '' }]); setOpenKeys((prev) => new Set(prev).add(`${sec.key}:${list.length}`)); }}>＋ Add {sec.noun}</button>}
      </Section>
    );
  };

  /* ---------- spells ---------- */
  const spells = value.spells;
  const setSpells = (next: Spell[]) => onChange({ spells: next });
  const patchSpell = (i: number, p: Partial<Spell>) => setSpells(spells.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const sc = value.spellcasting ?? {};
  const castMod = sc.ability ? mods[sc.ability] : undefined;

  /* ---------- equipment ---------- */
  const gear = value.equipment;
  const setGear = (next: GearItem[]) => onChange({ equipment: next });
  const patchGear = (i: number, p: Partial<GearItem>) => setGear(gear.map((x, k) => (k === i ? { ...x, ...p } : x)));

  return (
    <div className={bare ? 'sbe' : 'sbe card-theme p-4 mb-4'}>
      {!bare && <h5 className="text-theme mb-3">Stat block</h5>}

      {want('details') && (
        <Section title="Details" count={0} defaultOpen hint="Speed, senses, languages and defenses show up in the session quick view.">
          <div className="sbe-grid">
            <label className="sbe-f"><span>Speed</span><input className="sbe-in" placeholder="30 ft., fly 60 ft." value={value.speed} disabled={off} onChange={(e) => onChange({ speed: e.target.value })} /></label>
            <label className="sbe-f"><span>Senses</span><input className="sbe-in" placeholder="Darkvision 60 ft." value={value.senses} disabled={off} onChange={(e) => onChange({ senses: e.target.value })} /></label>
            <label className="sbe-f"><span>Languages</span><input className="sbe-in" placeholder="Common, Goblin" value={value.languages} disabled={off} onChange={(e) => onChange({ languages: e.target.value })} /></label>
            <label className="sbe-f sbe-span"><span>Resistances / immunities / vulnerabilities</span><input className="sbe-in" placeholder="Resist fire; immune to poison, poisoned" value={value.defenses} disabled={off} onChange={(e) => onChange({ defenses: e.target.value })} /></label>
          </div>
        </Section>
      )}

      {want('combat') && FEATURE_SECTIONS.map(featureList)}

      {want('magic') && (
        <>
          <Section title="Spells" count={spells.length} hint="Known or prepared spells. The quick view groups them by level.">
            <div className="sbe-line sbe-line--top">
              <label className="sbe-f"><span>Spellcasting ability</span>
                <select className="sbe-in sbe-w-md" value={sc.ability ?? ''} disabled={off} onChange={(e) => onChange({ spellcasting: { ...sc, ability: e.target.value || undefined } })}>
                  <option value="">None</option>
                  {['intelligence', 'wisdom', 'charisma'].map((k) => <option key={k} value={k}>{ABILITY_SCORES.find((a) => a.key === k)?.label}</option>)}
                </select>
              </label>
              {castMod !== undefined && <span className="sbe-result">DC {8 + pb + castMod} · {signed(pb + castMod)} to hit</span>}
            </div>
            <div className="sbe-f"><span>Spell slots per level</span>
              <div className="sbe-slots">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <label key={lvl}><em>L{lvl}</em>
                    <input className="sbe-in" type="number" min={0} max={9} value={sc.slots?.[String(lvl)] ?? ''} disabled={off} aria-label={`Level ${lvl} slots`}
                      onChange={(e) => onChange({ spellcasting: { ...sc, slots: { ...(sc.slots ?? {}), [String(lvl)]: e.target.value } } })} />
                  </label>
                ))}
              </div>
            </div>
            <div className="sbe-cards">
              {spells.map((sp, i) => (
                <div key={i} className="sbe-card is-open">
                  <div className="sbe-card-head">
                    <input className="sbe-name" placeholder="Spell name" value={sp.name} disabled={off} aria-label="Spell name" onChange={(e) => patchSpell(i, { name: e.target.value })} />
                    <select className="sbe-in sbe-w-md" value={sp.level} disabled={off} aria-label="Spell level" onChange={(e) => patchSpell(i, { level: Number(e.target.value) })}>
                      <option value={0}>Cantrip</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                    <Tools i={i} len={spells.length} disabled={off} onMove={(d) => setSpells(move(spells, i, d))} onRemove={() => setSpells(spells.filter((_, k) => k !== i))} />
                  </div>
                  <div className="sbe-body">
                    <div className="sbe-line">
                      <label className="sbe-f"><span>Uses</span><input className="sbe-in sbe-w-lg" placeholder="At will · 3/day" value={sp.uses ?? ''} disabled={off} onChange={(e) => patchSpell(i, { uses: e.target.value })} /></label>
                      <label className="sbe-check"><input type="checkbox" checked={!!sp.concentration} disabled={off} onChange={(e) => patchSpell(i, { concentration: e.target.checked })} /> Concentration</label>
                      <label className="sbe-f sbe-grow"><span>Effect / reminder</span><input className="sbe-in" placeholder="8d6 fire, DEX save half" value={sp.desc ?? ''} disabled={off} onChange={(e) => patchSpell(i, { desc: e.target.value })} /></label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!off && <button type="button" className="sbe-add" onClick={() => setSpells([...spells, { name: '', level: 0 }])}>＋ Add spell</button>}
          </Section>

          <Section title="Equipment" count={gear.length} hint="Gear and loot this NPC carries.">
            <div className="sbe-cards">
              {gear.map((g, i) => (
                <div key={i} className="sbe-card is-open">
                  <div className="sbe-card-head">
                    <input className="sbe-name" placeholder="Item" value={g.name} disabled={off} aria-label="Item" onChange={(e) => patchGear(i, { name: e.target.value })} />
                    <input className="sbe-in sbe-w-xs" type="number" min={1} placeholder="Qty" value={g.qty ?? ''} disabled={off} aria-label="Quantity" onChange={(e) => patchGear(i, { qty: e.target.value })} />
                    <Tools i={i} len={gear.length} disabled={off} onMove={(d) => setGear(move(gear, i, d))} onRemove={() => setGear(gear.filter((_, k) => k !== i))} />
                  </div>
                  <div className="sbe-body">
                    <input className="sbe-in" placeholder="Notes" value={g.desc ?? ''} disabled={off} aria-label="Notes" onChange={(e) => patchGear(i, { desc: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
            {!off && <button type="button" className="sbe-add" onClick={() => setGear([...gear, { name: '' }])}>＋ Add item</button>}
          </Section>
        </>
      )}
    </div>
  );
};

export default NpcStatblockEditor;
