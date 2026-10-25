import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCampaigns } from '../../../../api/backendHelpers';
import RichTextEditor from '../../../../components/formComponents/RichTextEditor';
import { ABILITY_SCORES, DND_SKILLS } from '../../Characters/constants';
import NpcSkills from './NpcSkills';
import NpcStatblockEditor from './NpcStatblockEditor';
import {
  cleanStatblock, emptyStatblock, modOfScore, proficiencyForCr, statblockFrom, type StatblockFields,
} from '../statblock';
import '../../../../styles/npcBuilder.css';

export interface NpcData extends StatblockFields {
  name: string;
  disposition: string;
  challenge_rating: string;
  armor_class: number;
  max_hp: number;
  current_hp: number;
  image_url: string;
  campaign_id: string;
  /** Comma-separated in the UI, an array on the wire. */
  categories: string;
  notes: string;
  skills: string[];
  strength: number; dexterity: number; constitution: number;
  intelligence: number; wisdom: number; charisma: number;
}

export const blankNpc = (): NpcData => ({
  ...emptyStatblock(),
  name: '', disposition: 'neutral', challenge_rating: '', armor_class: 10, max_hp: 10, current_hp: 10,
  image_url: '', campaign_id: '', categories: '', notes: '', skills: [],
  strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
});

export const npcFromApi = (d: any): NpcData => ({
  ...blankNpc(),
  ...statblockFrom(d),
  name: d.name ?? '',
  disposition: d.disposition ?? 'neutral',
  challenge_rating: d.challenge_rating ?? '',
  armor_class: d.armor_class ?? 10,
  max_hp: d.max_hp ?? 10,
  current_hp: d.current_hp ?? 10,
  image_url: d.image_url ?? '',
  campaign_id: d.campaign_id ?? '',
  categories: (d.categories ?? []).join(', '),
  notes: d.notes ?? '',
  skills: d.skills ?? [],
  strength: d.strength ?? 10, dexterity: d.dexterity ?? 10, constitution: d.constitution ?? 10,
  intelligence: d.intelligence ?? 10, wisdom: d.wisdom ?? 10, charisma: d.charisma ?? 10,
});

export const npcPayload = (n: NpcData) => ({
  ...cleanStatblock(n),
  name: n.name,
  disposition: n.disposition,
  challenge_rating: n.challenge_rating,
  armor_class: n.armor_class,
  max_hp: n.max_hp,
  current_hp: n.current_hp,
  image_url: n.image_url,
  notes: n.notes,
  skills: n.skills,
  categories: n.categories.split(',').map((c) => c.trim()).filter(Boolean),
  strength: n.strength, dexterity: n.dexterity, constitution: n.constitution,
  intelligence: n.intelligence, wisdom: n.wisdom, charisma: n.charisma,
});

type Tab = 'overview' | 'abilities' | 'actions' | 'magic' | 'notes';
type Status = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  mode: 'new' | 'edit';
  initial: NpcData;
  isOwner: boolean;
  /** edit mode: debounced autosave. campaign_id is included for moves. */
  onSave?: (data: NpcData) => Promise<void>;
  /** new mode */
  onCreate?: (data: NpcData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const DISPOSITIONS = ['hostile', 'neutral', 'friendly'];
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export default function NpcBuilder({ mode, initial, isOwner, onSave, onCreate, onDelete }: Props) {
  const navigate = useNavigate();
  const [npc, setNpc] = useState<NpcData>(initial);
  const [tab, setTab] = useState<Tab>('overview');
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [creating, setCreating] = useState(false);
  const dirty = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    getCampaigns()
      .then((r) => {
        const owned = r.data.filter((c: any) => c.role !== 'player');
        setCampaigns(owned);
        if (mode === 'new') setNpc((n) => (n.campaign_id || !owned.length ? n : { ...n, campaign_id: owned[0].id }));
      })
      .catch(() => setError('Could not load campaigns.'));
  }, [mode]);

  const set = (patch: Partial<NpcData>) => { dirty.current = true; setNpc((n) => ({ ...n, ...patch })); };
  const setNum = (key: keyof NpcData) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: parseInt(e.target.value, 10) || 0 } as Partial<NpcData>);

  // Autosave (edit mode): 700ms after the last change.
  useEffect(() => {
    if (mode !== 'edit' || !isOwner || !onSave) return;
    if (first.current) { first.current = false; return; }
    if (!dirty.current) return;
    setStatus('saving');
    const t = setTimeout(() => {
      onSave(npc).then(() => { dirty.current = false; setStatus('saved'); setError(''); })
        .catch((err: any) => { setStatus('error'); setError(err?.response?.data?.errors?.join(', ') || 'Could not save.'); });
    }, 700);
    return () => clearTimeout(t);
  }, [npc, mode, isOwner]); // eslint-disable-line react-hooks/exhaustive-deps

  const mods = useMemo(() => Object.fromEntries(ABILITY_SCORES.map((a) => [a.key, modOfScore((npc as any)[a.key])])), [npc]);
  const pb = proficiencyForCr(npc.challenge_rating);
  const perceptionBonus = mods.wisdom + (npc.skills.map((s) => s.toLowerCase()).includes('perception') ? pb : 0);
  const off = !isOwner;

  const create = async () => {
    if (!npc.name.trim()) { setError('Give your NPC a name first.'); setTab('overview'); return; }
    if (!npc.campaign_id) { setError('Pick a campaign for this NPC.'); setTab('overview'); return; }
    setCreating(true);
    setError('');
    try { await onCreate?.(npc); } catch (err: any) {
      setError(err?.response?.data?.errors?.join(', ') || 'Something went wrong');
      setCreating(false);
    }
  };

  const counts = {
    combat: npc.actions.length + npc.bonus_actions.length + npc.reactions.length + npc.legendary_actions.length + npc.traits.length,
    magic: npc.spells.length + npc.equipment.length,
  };
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'abilities', label: 'Abilities' },
    { key: 'actions', label: 'Actions', count: counts.combat },
    { key: 'magic', label: 'Magic & Gear', count: counts.magic },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div className="npcb">
      {/* ---------- header ---------- */}
      <div className="npcb-header">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/dashboard/npcs')}>← NPCs</button>
        <input
          className="npcb-name" placeholder="Name your NPC" aria-label="NPC name" value={npc.name} disabled={off}
          onChange={(e) => set({ name: e.target.value })}
        />
        <div className="npcb-dispo" role="group" aria-label="Disposition">
          {DISPOSITIONS.map((d) => (
            <button key={d} type="button" disabled={off} className={`npcb-dispo-btn is-${d} ${npc.disposition === d ? 'is-on' : ''}`} onClick={() => set({ disposition: d })}>{d}</button>
          ))}
        </div>
        <div className="npcb-header-end">
          {mode === 'edit' && status === 'saving' && <span className="npcb-status">Saving…</span>}
          {mode === 'edit' && status === 'saved' && <span className="npcb-status is-ok">Saved</span>}
          {error && <span className="npcb-status is-bad">{error}</span>}
          {mode === 'new' && <button type="button" className="btn btn-theme-primary" onClick={create} disabled={creating}>{creating ? 'Creating…' : 'Create NPC'}</button>}
          {mode === 'edit' && isOwner && onDelete && (
            <button type="button" className={`btn btn-sm ${confirmDel ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => (confirmDel ? onDelete() : setConfirmDel(true))} onBlur={() => setConfirmDel(false)}>
              {confirmDel ? 'Really delete?' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      <div className="npcb-body">
        {/* ---------- live card ---------- */}
        <aside className="npcb-card" aria-label="NPC summary">
          <div className="npcb-portrait">
            {npc.image_url
              ? <img src={npc.image_url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <span>{npc.name.trim() ? npc.name.trim()[0].toUpperCase() : '?'}</span>}
          </div>
          <h3 className="npcb-card-name">{npc.name || 'Unnamed NPC'}</h3>
          <div className="npcb-card-sub">
            <span className={`npc-disposition-badge npc-disposition-${npc.disposition}`}>{npc.disposition}</span>
            {npc.challenge_rating && <span>CR {npc.challenge_rating}</span>}
          </div>
          <div className="npcb-vitals">
            <div><em>AC</em><strong>{npc.armor_class}</strong></div>
            <div><em>HP</em><strong>{npc.max_hp}</strong></div>
            <div><em>PROF</em><strong>{signed(pb)}</strong></div>
          </div>
          <div className="npcb-mods">
            {ABILITY_SCORES.map((a) => (
              <div key={a.key}><em>{a.label}</em><strong>{signed(mods[a.key])}</strong></div>
            ))}
          </div>
          <dl className="npcb-facts">
            <div><dt>Initiative</dt><dd>{signed(mods.dexterity)}</dd></div>
            <div><dt>Passive Perception</dt><dd>{10 + perceptionBonus}</dd></div>
            {npc.speed && <div><dt>Speed</dt><dd>{npc.speed}</dd></div>}
            {npc.senses && <div><dt>Senses</dt><dd>{npc.senses}</dd></div>}
            {npc.languages && <div><dt>Languages</dt><dd>{npc.languages}</dd></div>}
            {npc.defenses && <div><dt>Defenses</dt><dd>{npc.defenses}</dd></div>}
          </dl>
          {(counts.combat > 0 || counts.magic > 0) && (
            <div className="npcb-card-counts">
              {npc.actions.length > 0 && <span>{npc.actions.length} action{npc.actions.length > 1 ? 's' : ''}</span>}
              {npc.bonus_actions.length > 0 && <span>{npc.bonus_actions.length} bonus</span>}
              {npc.reactions.length > 0 && <span>{npc.reactions.length} reaction{npc.reactions.length > 1 ? 's' : ''}</span>}
              {npc.spells.length > 0 && <span>{npc.spells.length} spell{npc.spells.length > 1 ? 's' : ''}</span>}
              {npc.equipment.length > 0 && <span>{npc.equipment.length} item{npc.equipment.length > 1 ? 's' : ''}</span>}
            </div>
          )}
        </aside>

        {/* ---------- tabs ---------- */}
        <section className="npcb-main">
          <div className="npcb-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-on' : ''} onClick={() => setTab(t.key)}>
                {t.label}{t.count ? <span className="npcb-tab-count">{t.count}</span> : null}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="npcb-panel">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-muted-theme">Campaign</label>
                  <select className="form-select input-theme" value={npc.campaign_id} disabled={off} onChange={(e) => set({ campaign_id: e.target.value })}>
                    {mode === 'edit' && <option value="">No campaign</option>}
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted-theme">Tags</label>
                  <input className="form-control input-theme" placeholder="Tavern keeper, Recurring" value={npc.categories} disabled={off} onChange={(e) => set({ categories: e.target.value })} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label text-muted-theme">Challenge rating</label>
                  <input className="form-control input-theme" placeholder="1/2" value={npc.challenge_rating} disabled={off} onChange={(e) => set({ challenge_rating: e.target.value })} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label text-muted-theme">Armor class</label>
                  <input className="form-control input-theme" type="number" min={0} value={npc.armor_class} disabled={off} onChange={setNum('armor_class')} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label text-muted-theme">Max HP</label>
                  <input className="form-control input-theme" type="number" min={1} value={npc.max_hp} disabled={off}
                    onChange={(e) => { const m = Math.max(1, parseInt(e.target.value, 10) || 1); set({ max_hp: m, current_hp: mode === 'new' ? m : Math.min(npc.current_hp, m) }); }} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label text-muted-theme">Current HP</label>
                  <input className="form-control input-theme" type="number" min={0} value={npc.current_hp} disabled={off} onChange={setNum('current_hp')} />
                </div>
                <div className="col-12">
                  <label className="form-label text-muted-theme">Portrait URL</label>
                  <input className="form-control input-theme" placeholder="https://…" value={npc.image_url} disabled={off} onChange={(e) => set({ image_url: e.target.value })} />
                </div>
              </div>
              <h6 className="npcb-h">Traits of the creature</h6>
              <NpcStatblockEditor bare show="details" value={npc} onChange={set} isOwner={isOwner} scores={npc as any} challengeRating={npc.challenge_rating} />
            </div>
          )}

          {tab === 'abilities' && (
            <div className="npcb-panel">
              <h6 className="npcb-h">Ability scores &amp; saving throws</h6>
              <div className="npcb-abilities">
                {ABILITY_SCORES.map((a) => {
                  const score = (npc as any)[a.key] as number;
                  const proficient = npc.saving_throws.includes(a.key);
                  return (
                    <div key={a.key} className="npcb-ability">
                      <em>{a.label}</em>
                      <strong className="npcb-ability-mod">{signed(mods[a.key])}</strong>
                      <div className="npcb-stepper">
                        <button type="button" disabled={off || score <= 1} aria-label={`Decrease ${a.label}`} onClick={() => set({ [a.key]: score - 1 } as Partial<NpcData>)}>−</button>
                        <input type="number" min={1} max={30} value={score} disabled={off} aria-label={`${a.label} score`} onChange={setNum(a.key as keyof NpcData)} />
                        <button type="button" disabled={off || score >= 30} aria-label={`Increase ${a.label}`} onClick={() => set({ [a.key]: score + 1 } as Partial<NpcData>)}>+</button>
                      </div>
                      <button type="button" disabled={off} aria-pressed={proficient} className={`npcb-save ${proficient ? 'is-on' : ''}`}
                        onClick={() => set({ saving_throws: proficient ? npc.saving_throws.filter((x) => x !== a.key) : [...npc.saving_throws, a.key] })}>
                        {proficient ? '●' : '○'} Save {signed(mods[a.key] + (proficient ? pb : 0))}
                      </button>
                    </div>
                  );
                })}
              </div>
              <NpcSkills
                skills={npc.skills}
                onToggle={(sk) => set({ skills: npc.skills.includes(sk) ? npc.skills.filter((x) => x !== sk) : [...npc.skills, sk] })}
                scores={npc as any}
                challengeRating={npc.challenge_rating}
                isOwner={isOwner}
              />
              <p className="text-muted-theme" style={{ fontSize: '0.78rem' }}>
                {DND_SKILLS.length} skills · proficiency bonus {signed(pb)} comes from the challenge rating.
              </p>
            </div>
          )}

          {tab === 'actions' && (
            <div className="npcb-panel">
              <NpcStatblockEditor bare show="combat" skills={npc.skills} value={npc} onChange={set} isOwner={isOwner} scores={npc as any} challengeRating={npc.challenge_rating} />
            </div>
          )}

          {tab === 'magic' && (
            <div className="npcb-panel">
              <NpcStatblockEditor bare show="magic" value={npc} onChange={set} isOwner={isOwner} scores={npc as any} challengeRating={npc.challenge_rating} />
            </div>
          )}

          {tab === 'notes' && (
            <div className="npcb-panel">
              <RichTextEditor content={npc.notes} onChange={(html) => set({ notes: html })} readOnly={off} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
