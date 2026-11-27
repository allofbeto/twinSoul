import { useCallback, useMemo, useRef, useState } from 'react';
import type { CreateCampaignObject } from '../formComponents/editor/CampaignObjectMention';
import { renderNotes } from '../../pages/Dashboard/Theatre/Components/sanitizeNotes';
import BlockEditor from './BlockEditor';
import EntityLayer from './EntityLayer';
import BeatWizard from './BeatWizard';
import { SectionEdit, SectionView } from './BeatSections';
import { useCampaignTracks } from './useTracks';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, GripIcon, TrashIcon } from './Icons';
import {
  BEAT_TYPES, beatProgress, beatRefs, beatType, move, newScene, parseNotebook, sceneMatches, sectionFilled, sectionLabel,
  serializeNotebook, uid,
  type Beat, type BeatType, type Notebook, type Scene, type SectionKey,
} from './model';
import '../../styles/SessionNotebook.css';

interface Props {
  /** sessions.notes — notebook JSON, or legacy Tiptap HTML. */
  value: string;
  onChange: (serialized: string) => void;
  campaignId?: string;
  onCreateObject?: CreateCampaignObject;
  /** Narrow layout for the theatre side pane: scene dropdown instead of a sidebar. */
  compact?: boolean;
  /** Start in run mode (editing controls hidden). */
  startInRun?: boolean;
  saveLabel?: string;
  /** Set inside the theatre: lets beats put their NPCs / items on stage and open their encounter. */
  theatre?: TheatreHooks;
}

export interface TheatreHooks {
  /** Whether this campaign object can be put on the stage. */
  canReveal: (id: string) => boolean;
  isOnStage: (id: string) => boolean;
  reveal: (id: string) => void;
  openEncounter: (encounterId: string) => void;
  /** Start (or jump to) the fight on this beat's battle map. */
  openMap?: (map: { id: string; name: string }) => void;
}

const REF_ICON: Record<string, string> = { npc: '🧙', item: '🗡️', map: '🗺️' };

const SECTION_ORDER: SectionKey[] = ['read', 'npcs', 'find', 'branches', 'stage', 'note'];

/** Little summary chips for a collapsed beat. */
function beatChips(b: Beat): { cls: string; text: string }[] {
  const chips: { cls: string; text: string }[] = [];
  if (b.encounter) chips.push({ cls: 'fight', text: `⚔ ${b.encounter.name}` });
  if (b.map) chips.push({ cls: 'art', text: `🗺 ${b.map.name}` });
  b.npcs.filter((n) => n.name).forEach((n) => chips.push({ cls: 'npc', text: n.name }));
  if (sectionFilled(b, 'read')) chips.push({ cls: '', text: '📖' });
  if (sectionFilled(b, 'find')) chips.push({ cls: 'find', text: sectionLabel('find', b.type).split(' ')[0] });
  if (sectionFilled(b, 'branches')) chips.push({ cls: '', text: '⑂' });
  if (b.trackId || b.musicUrl) chips.push({ cls: 'music', text: '♫' });
  if (b.artUrl) chips.push({ cls: 'art', text: '▧' });
  return chips;
}

export default function SessionNotebook({
  value, onChange, campaignId, onCreateObject, compact = false, startInRun = false, saveLabel, theatre,
}: Props) {
  const [nb, setNb] = useState<Notebook>(() => parseNotebook(value));
  const [activeId, setActiveId] = useState(() => nb.scenes[0].id);
  const [run, setRun] = useState(startInRun);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set(nb.scenes[0].beats[0] ? [nb.scenes[0].beats[0].id] : []));
  // Sections the DM opened by hand on a beat (beyond the filled ones and the type's defaults).
  const [shown, setShown] = useState<Record<string, SectionKey[]>>({});
  // Guided builder: where the new beat goes (index to insert after; -1 = at the top).
  const [wizard, setWizard] = useState<{ afterIndex: number } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; over?: string; after?: boolean } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const { tracks } = useCampaignTracks(campaignId);
  const nbRef = useRef(nb);
  nbRef.current = nb;

  const commit = useCallback((next: Notebook) => {
    setNb(next);
    onChange(serializeNotebook(next));
  }, [onChange]);

  const scene = nb.scenes.find((s) => s.id === activeId) ?? nb.scenes[0];
  const progress = useMemo(() => beatProgress(nb), [nb]);

  // Always patch from nbRef so several patches in one tick (e.g. editor
  // onChange + a picker) don't overwrite each other.
  const patchScene = (fn: (s: Scene) => Scene) => {
    const next = { ...nbRef.current, scenes: nbRef.current.scenes.map((s) => (s.id === scene.id ? fn(s) : s)) };
    nbRef.current = next;
    commit(next);
  };
  const patchBeat = (beatId: string, fn: (b: Beat) => Beat) =>
    patchScene((s) => ({ ...s, beats: s.beats.map((b) => (b.id === beatId ? fn(b) : b)) }));

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // `known` is for a scene that was only just added: nbRef still holds the previous render's
  // notebook at that point, so looking it up there would find nothing.
  const pickScene = (id: string, known?: Scene) => {
    const s = known ?? nbRef.current.scenes.find((x) => x.id === id);
    setActiveId(id);
    setOpen(new Set(s?.beats.length ? [s.beats[0].id] : []));
    setConfirm(null);
  };

  const addScene = () => {
    const s = newScene(`Scene ${nbRef.current.scenes.length + 1}`);
    commit({ ...nbRef.current, scenes: [...nbRef.current.scenes, s] });
    pickScene(s.id, s);
  };

  const duplicateScene = () => {
    const copy: Scene = JSON.parse(JSON.stringify(scene));
    copy.id = uid();
    copy.title = `${scene.title.replace(/ \(copy\)$/, '')} (copy)`;
    copy.beats.forEach((b) => { b.id = uid(); b.npcs.forEach((n) => { n.key = uid(); }); });
    // Right after the original, so the copy is where you're looking.
    const scenes = nbRef.current.scenes.slice();
    scenes.splice(scenes.findIndex((x) => x.id === scene.id) + 1, 0, copy);
    commit({ ...nbRef.current, scenes });
    pickScene(copy.id, copy);
  };

  // Reorder scenes: by buttons (±1) or by dragging a row to above/below another.
  const moveSceneBy = (id: string, delta: number) => {
    const list = nbRef.current.scenes;
    const i = list.findIndex((x) => x.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    commit({ ...nbRef.current, scenes: move(list, i, delta) });
  };

  const dropScene = (fromId: string, toId: string, after: boolean) => {
    if (fromId === toId) return;
    const list = nbRef.current.scenes.slice();
    const [moving] = list.splice(list.findIndex((x) => x.id === fromId), 1);
    const at = list.findIndex((x) => x.id === toId) + (after ? 1 : 0);
    list.splice(at, 0, moving);
    commit({ ...nbRef.current, scenes: list });
  };

  const deleteScene = () => {
    if (nb.scenes.length < 2) return;
    const rest = nb.scenes.filter((s) => s.id !== scene.id);
    commit({ ...nb, scenes: rest });
    pickScene(rest[0].id);
  };

  const insertBeat = (beat: Beat, afterIndex: number) => {
    patchScene((s) => {
      const beats = s.beats.slice();
      beats.splice(afterIndex + 1, 0, beat);
      return { ...s, beats };
    });
    setOpen((p) => new Set(p).add(beat.id));
  };

  const duplicateBeat = (i: number) => {
    const copy: Beat = JSON.parse(JSON.stringify(scene.beats[i]));
    copy.id = uid();
    copy.title += ' (copy)';
    copy.npcs.forEach((n) => { n.key = uid(); });
    insertBeat(copy, i);
  };

  const askDelete = (key: string, doIt: () => void) => {
    if (confirm === key) { setConfirm(null); doIt(); } else setConfirm(key);
  };

  const visibleScenes = nb.scenes.filter((s) => sceneMatches(s, query));

  // ---------------- beats ----------------

  // Theatre only: what this beat can put in front of the players (or, for fights, open for the DM).
  const renderStageBar = (beat: Beat) => {
    if (!theatre) return null;
    const refs = beatRefs(beat).filter((r) => theatre.canReveal(r.id));
    if (!refs.length && !beat.encounter && !(beat.map && theatre.openMap)) return null;
    return (
      <div className="nb-stagebar" role="group" aria-label="Bring this beat to the table">
        {beat.encounter && (
          <button type="button" className="nb-stagebar-btn nb-stagebar-btn--fight" onClick={() => theatre.openEncounter(beat.encounter!.id)}
            title="Open in Encounters — secret until you start it">
            ⚔ {beat.encounter.name} <em>Encounter ›</em>
          </button>
        )}
        {beat.map && theatre.openMap && (
          <button type="button" className="nb-stagebar-btn nb-stagebar-btn--fight" onClick={() => theatre.openMap!(beat.map!)}
            title="Open Combat on this battle map">
            🗺 {beat.map.name} <em>Fight here ›</em>
          </button>
        )}
        {refs.map((r) => {
          const on = theatre.isOnStage(r.id);
          return (
            <button key={r.id} type="button" className={`nb-stagebar-btn ${on ? 'is-on' : ''}`} disabled={on}
              onClick={() => theatre.reveal(r.id)} title={on ? 'Already on stage' : 'Show this to the players on the Stage'}>
              {REF_ICON[r.kind]} {r.label} <em>{on ? 'On stage ✓' : 'Reveal'}</em>
            </button>
          );
        })}
      </div>
    );
  };

  const renderBeat = (beat: Beat, bi: number) => {
    const isOpen = open.has(beat.id);
    const info = beatType(beat.type);
    const visible = SECTION_ORDER.filter((k) =>
      sectionFilled(beat, k) || (!run && (info.steps.includes(k) || shown[beat.id]?.includes(k))));
    const hidden = SECTION_ORDER.filter((k) => !visible.includes(k));
    const chips = beatChips(beat);

    return (
      <article key={beat.id} className={`nb-beat ${beat.done ? 'is-done' : ''} ${isOpen ? 'is-open' : ''}`}>
        <div className="nb-beat-head">
          <input
            type="checkbox" className="nb-check" checked={beat.done} title="Mark beat complete"
            onChange={(e) => patchBeat(beat.id, (b) => ({ ...b, done: e.target.checked }))}
          />
          {!run && isOpen ? (
            <label className={`nb-type-ico nb-type-ico--${beat.type} nb-type-pick`} title={`${info.label} — change type`}>
              <span aria-hidden="true">{info.icon}</span>
              <select
                aria-label="Beat type" value={beat.type}
                onChange={(e) => patchBeat(beat.id, (b) => ({ ...b, type: e.target.value as BeatType }))}
              >
                {BEAT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}
              </select>
            </label>
          ) : (
            <span className={`nb-type-ico nb-type-ico--${beat.type}`} title={info.label} aria-label={info.label}>{info.icon}</span>
          )}
          {!run && isOpen ? (
            <input
              className="nb-beat-title-input" value={beat.title} aria-label="Beat title"
              onChange={(e) => patchBeat(beat.id, (b) => ({ ...b, title: e.target.value }))}
            />
          ) : (
            <button type="button" className="nb-beat-title" onClick={() => toggleOpen(beat.id)}>{beat.title || 'Untitled beat'}</button>
          )}
          {!isOpen && chips.length > 0 && (
            <span className="nb-chips" aria-hidden="true">
              {chips.slice(0, 4).map((c, i) => <span key={i} className={`nb-chip ${c.cls ? `nb-chip--${c.cls}` : ''}`}>{c.text}</span>)}
            </span>
          )}
          {!run && isOpen && (
            <span className="nb-actions nb-actions--show">
              <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" title="Move up" aria-label="Move up"
                onClick={() => patchScene((s) => ({ ...s, beats: move(s.beats, bi, -1) }))}><ChevronUpIcon /></button>
              <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" title="Move down" aria-label="Move down"
                onClick={() => patchScene((s) => ({ ...s, beats: move(s.beats, bi, 1) }))}><ChevronDownIcon /></button>
              <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" title="Duplicate beat" aria-label="Duplicate beat"
                onClick={() => duplicateBeat(bi)}><CopyIcon /></button>
              <button type="button" className={`nb-btn nb-btn--ghost nb-btn--sm nb-btn--trash ${confirm === beat.id ? 'nb-btn--danger' : ''}`}
                title="Delete beat" aria-label="Delete beat"
                onClick={() => askDelete(beat.id, () => patchScene((s) => ({ ...s, beats: s.beats.filter((b) => b.id !== beat.id) })))}>
                {confirm === beat.id ? <span>Delete?</span> : <TrashIcon />}
              </button>
            </span>
          )}
          <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" aria-expanded={isOpen}
            aria-label={isOpen ? 'Collapse beat' : 'Expand beat'} onClick={() => toggleOpen(beat.id)}>
            {isOpen ? '▾' : '▸'}
          </button>
        </div>
        {isOpen && (
          <div className="nb-beat-body">
            {theatre && renderStageBar(beat)}
            {visible.map((k) => (
              <section key={k} className={`nb-sec nb-sec--${k}`}>
                <div className="nb-sec-label">{sectionLabel(k, beat.type)}</div>
                {run ? (
                  <SectionView beat={beat} section={k} tracks={tracks} />
                ) : (
                  <SectionEdit
                    beat={beat} section={k} campaignId={campaignId} onCreateObject={onCreateObject}
                    patch={(fn) => patchBeat(beat.id, fn)}
                  />
                )}
              </section>
            ))}
            {run && !visible.length && <div className="nb-note">Nothing written for this beat.</div>}
            {!run && (
              <div className="nb-addline">
                {hidden.map((k) => (
                  <button key={k} type="button" className="nb-btn nb-btn--ghost nb-btn--sm nb-ghost-sec"
                    onClick={() => setShown((p) => ({ ...p, [beat.id]: [...(p[beat.id] ?? []), k] }))}>
                    ＋ {sectionLabel(k, beat.type).replace(/^\S+\s/, '')}
                  </button>
                ))}
                <span className="nb-addline-spacer" />
                <button type="button" className="nb-btn nb-btn--sm" onClick={() => setWizard({ afterIndex: bi })}>＋ Beat after</button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  // ---------------- layout ----------------

  const header = (
    <div className="nb-topbar">
      <div className="nb-progress" title={`${progress.done} of ${progress.total} beats completed`}>
        <div className="nb-meter"><div style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} /></div>
        <span>{progress.done}/{progress.total} beats</span>
      </div>
      {saveLabel && <span className="nb-save">{saveLabel}</span>}
      <button type="button" className={`nb-btn ${run ? '' : 'nb-btn--primary'}`}
        onClick={() => { setRun((r) => !r); setConfirm(null); }}>
        {run ? '✎ Edit' : '▶ Run'}
      </button>
    </div>
  );

  const sceneNav = compact ? (
    <select className="nb-input nb-scene-select" value={scene.id} onChange={(e) => pickScene(e.target.value)} aria-label="Scene">
      {nb.scenes.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
    </select>
  ) : (
    <nav className="nb-nav" aria-label="Scenes">
      <input className="nb-input" placeholder="Find a scene or beat…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {visibleScenes.map((s) => {
        // Reordering only makes sense on the full, unfiltered list.
        const canMove = !run && !query;
        const idx = nb.scenes.findIndex((x) => x.id === s.id);
        const over = drag?.over === s.id && drag.id !== s.id;
        return (
          <div
            key={s.id}
            className={`nb-scene-row ${s.id === scene.id ? 'is-active' : ''} ${drag?.id === s.id ? 'is-dragging' : ''} ${over ? (drag?.after ? 'is-over-after' : 'is-over-before') : ''}`}
            draggable={canMove}
            onDragStart={(e) => { if (!canMove) return; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); setDrag({ id: s.id }); }}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const after = e.clientY > r.top + r.height / 2;
              if (drag.over !== s.id || drag.after !== after) setDrag({ id: drag.id, over: s.id, after });
            }}
            onDrop={(e) => { e.preventDefault(); if (drag) dropScene(drag.id, s.id, !!drag.after); setDrag(null); }}
            onDragEnd={() => setDrag(null)}
          >
            {canMove && <span className="nb-grip" aria-hidden="true" title="Drag to reorder"><GripIcon /></span>}
            <button type="button" className={`nb-scene-btn ${s.id === scene.id ? 'is-active' : ''}`} onClick={() => pickScene(s.id)}>
              {s.title}<span>{s.beats.length} beats</span>
            </button>
            {canMove && (
              <span className="nb-scene-move">
                <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" disabled={idx === 0} onClick={() => moveSceneBy(s.id, -1)} aria-label={`Move ${s.title} up`} title="Move up"><ChevronUpIcon /></button>
                <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" disabled={idx === nb.scenes.length - 1} onClick={() => moveSceneBy(s.id, 1)} aria-label={`Move ${s.title} down`} title="Move down"><ChevronDownIcon /></button>
              </span>
            )}
          </div>
        );
      })}
      {!visibleScenes.length && <div className="nb-note">No matches</div>}
      {!run && <button type="button" className="nb-btn nb-btn--primary nb-block-btn" onClick={addScene}>＋ Scene</button>}
    </nav>
  );

  return (
    <div ref={rootRef} className={`nb ${compact ? 'nb--compact' : ''} ${run ? 'nb--run' : ''}`}>
      <EntityLayer rootRef={rootRef} run={run} />
      {header}
      <div className="nb-layout">
        {sceneNav}
        <div className="nb-main">
          {!run && (
            <div className="nb-scene-title-row">
              <input
                className="nb-scene-title-input" value={scene.title} aria-label="Scene title"
                onChange={(e) => patchScene((s) => ({ ...s, title: e.target.value }))}
              />
              {compact && (
                <>
                  <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" disabled={nb.scenes[0]?.id === scene.id} onClick={() => moveSceneBy(scene.id, -1)} aria-label="Move scene up" title="Move scene up"><ChevronUpIcon /></button>
                  <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" disabled={nb.scenes[nb.scenes.length - 1]?.id === scene.id} onClick={() => moveSceneBy(scene.id, 1)} aria-label="Move scene down" title="Move scene down"><ChevronDownIcon /></button>
                  <button type="button" className="nb-btn nb-btn--sm" onClick={addScene}>＋ Scene</button>
                </>
              )}
            </div>
          )}
          {run && <h2 className="nb-scene-title">{scene.title}</h2>}
          {run ? (
            scene.purpose && <div className="nb-purpose nb-html" dangerouslySetInnerHTML={{ __html: renderNotes(scene.purpose) }} />
          ) : (
            <div className="nb-purpose">
              <BlockEditor
                content={scene.purpose}
                onChange={(html) => patchScene((s) => ({ ...s, purpose: html }))}
                placeholder="What is this scene about?"
                campaignId={campaignId}
                onCreateObject={onCreateObject}
              />
            </div>
          )}
          {!run && (
            <div className="nb-scene-actions">
              <button type="button" className="nb-btn nb-btn--sm" onClick={duplicateScene}><CopyIcon /> Duplicate scene</button>
              <button type="button" className={`nb-btn nb-btn--sm ${confirm === 'scene' ? 'nb-btn--danger' : ''}`}
                disabled={nb.scenes.length < 2} onClick={() => askDelete('scene', deleteScene)}>
                <TrashIcon /> {confirm === 'scene' ? 'Really delete scene?' : 'Delete scene'}
              </button>
            </div>
          )}
          {scene.beats.map(renderBeat)}
          {!run && (
            <button type="button" className="nb-new-beat" onClick={() => setWizard({ afterIndex: scene.beats.length - 1 })}>
              <span className="nb-type-ico" aria-hidden="true">＋</span>
              <span>{scene.beats.length ? 'New beat' : 'Add your first beat'}</span>
              <em>Guided — answer a few quick questions</em>
            </button>
          )}
          {run && !scene.beats.length && <div className="nb-note">No beats in this scene yet.</div>}
        </div>
      </div>
      {wizard && (
        <BeatWizard
          campaignId={campaignId}
          onCreateObject={onCreateObject}
          after={scene.beats[wizard.afterIndex]?.title}
          themeFrom={rootRef}
          onCancel={() => setWizard(null)}
          onDone={(beat) => { insertBeat(beat, wizard.afterIndex); setWizard(null); }}
        />
      )}
    </div>
  );
}
