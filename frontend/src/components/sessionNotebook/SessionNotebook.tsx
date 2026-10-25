import { useCallback, useMemo, useRef, useState } from 'react';
import type { CreateCampaignObject } from '../formComponents/editor/CampaignObjectMention';
import { renderNotes } from '../../pages/Dashboard/Theatre/Components/sanitizeNotes';
import BlockEditor from './BlockEditor';
import NpcPicker from './NpcPicker';
import EntityLayer from './EntityLayer';
import TrackPicker from './TrackPicker';
import TrackCard from './TrackCard';
import { useCampaignTracks } from './useTracks';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, TrashIcon } from './Icons';
import {
  BLOCK_TYPES, beatProgress, blockLabel, move, newBeat, newBlock, newScene, parseNotebook, sceneMatches,
  serializeNotebook, uid,
  type Beat, type Block, type BlockType, type Notebook, type Scene,
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
}

const NPC_STARTER = '<ul><li><p></p></li></ul>';

export default function SessionNotebook({
  value, onChange, campaignId, onCreateObject, compact = false, startInRun = false, saveLabel,
}: Props) {
  const [nb, setNb] = useState<Notebook>(() => parseNotebook(value));
  const [activeId, setActiveId] = useState(() => nb.scenes[0].id);
  const [run, setRun] = useState(startInRun);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set([nb.scenes[0].beats[0]?.id]));
  const [palette, setPalette] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

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

  const patchScene = (fn: (s: Scene) => Scene) =>
    commit({ ...nbRef.current, scenes: nbRef.current.scenes.map((s) => (s.id === scene.id ? fn(s) : s)) });
  const patchBeat = (beatId: string, fn: (b: Beat) => Beat) =>
    patchScene((s) => ({ ...s, beats: s.beats.map((b) => (b.id === beatId ? fn(b) : b)) }));
  const patchBlock = (beatId: string, blockId: string, fn: (x: Block) => Block) =>
    patchBeat(beatId, (b) => ({ ...b, blocks: b.blocks.map((x) => (x.id === blockId ? fn(x) : x)) }));

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
    setPalette(null);
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
    copy.beats.forEach((b) => { b.id = uid(); b.blocks.forEach((x) => { x.id = uid(); }); });
    // Right after the original, so the copy is where you're looking.
    const scenes = nbRef.current.scenes.slice();
    scenes.splice(scenes.findIndex((x) => x.id === scene.id) + 1, 0, copy);
    commit({ ...nbRef.current, scenes });
    pickScene(copy.id, copy);
  };

  const deleteScene = () => {
    if (nb.scenes.length < 2) return;
    const rest = nb.scenes.filter((s) => s.id !== scene.id);
    commit({ ...nb, scenes: rest });
    pickScene(rest[0].id);
  };

  const addBeat = (afterIndex: number) => {
    const b = newBeat();
    patchScene((s) => {
      const beats = s.beats.slice();
      beats.splice(afterIndex + 1, 0, b);
      return { ...s, beats };
    });
    setOpen((p) => new Set(p).add(b.id));
  };

  const duplicateBeat = (i: number) => {
    const copy: Beat = JSON.parse(JSON.stringify(scene.beats[i]));
    copy.id = uid();
    copy.title += ' (copy)';
    copy.blocks.forEach((x) => { x.id = uid(); });
    patchScene((s) => {
      const beats = s.beats.slice();
      beats.splice(i + 1, 0, copy);
      return { ...s, beats };
    });
  };

  const addBlock = (beatId: string, type: BlockType) => {
    patchBeat(beatId, (b) => ({
      ...b,
      blocks: [...b.blocks, newBlock(type, type === 'npc' ? NPC_STARTER : '')],
    }));
    setPalette(null);
  };

  const askDelete = (key: string, doIt: () => void) => {
    if (confirm === key) { setConfirm(null); doIt(); } else setConfirm(key);
  };

  const visibleScenes = nb.scenes.filter((s) => sceneMatches(s, query));

  // ---------------- blocks ----------------

  const renderBlock = (beat: Beat, bi: number, block: Block, ki: number) => {
    const isEmpty = !block.content && !block.url && !block.npc && !block.trackId;

    if (run) {
      if (isEmpty) return null;
      return (
        <section key={block.id} className={`nb-block nb-block--${block.type}`}>
          <div className="nb-block-label">{blockLabel(block.type)}{block.npc && <span className="nb-npc-chip" data-id={block.npc.id} data-kind="npc" data-label={block.npc.name}>🧙 {block.npc.name}</span>}</div>
          {block.content && (
            <div className="nb-html" dangerouslySetInnerHTML={{ __html: renderNotes(block.content) }} />
          )}
          {block.type === 'art' && block.url && (
            <img className="nb-art" src={block.url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          {block.type === 'music' && block.trackId && tracks.find((t) => t.id === block.trackId) && (
            <TrackCard track={tracks.find((t) => t.id === block.trackId)!} />
          )}
          {block.type === 'music' && block.url && !block.trackId && (
            <a href={block.url} target="_blank" rel="noopener noreferrer">♫ Open music cue ↗</a>
          )}
        </section>
      );
    }

    return (
      <section key={block.id} className={`nb-block nb-block--${block.type}`}>
        <div className="nb-block-label">
          <span>{blockLabel(block.type)}</span>
          <span className="nb-actions">
            <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" title="Move up" aria-label="Move up"
              onClick={() => patchBeat(beat.id, (b) => ({ ...b, blocks: move(b.blocks, ki, -1) }))}><ChevronUpIcon /></button>
            <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" title="Move down" aria-label="Move down"
              onClick={() => patchBeat(beat.id, (b) => ({ ...b, blocks: move(b.blocks, ki, 1) }))}><ChevronDownIcon /></button>
            <button type="button" className={`nb-btn nb-btn--ghost nb-btn--sm nb-btn--trash ${confirm === block.id ? 'nb-btn--danger' : ''}`}
              title="Delete block" aria-label="Delete block"
              onClick={() => askDelete(block.id, () => patchBeat(beat.id, (b) => ({ ...b, blocks: b.blocks.filter((x) => x.id !== block.id) })))}>
              {confirm === block.id ? <span>Delete?</span> : <TrashIcon />}
            </button>
          </span>
        </div>
        {block.type === 'music' && (
          <TrackPicker
            campaignId={campaignId}
            trackId={block.trackId}
            legacyUrl={block.url}
            suggestedTitle={block.content.replace(/<[^>]+>/g, ' ').trim().split(/\s{2,}|\n/)[0]?.slice(0, 80)}
            onLink={(trackId) => patchBlock(beat.id, block.id, (x) => ({ ...x, trackId, ...(trackId ? { url: undefined } : {}) }))}
          />
        )}
        {block.type === 'npc' && (
          <NpcPicker
            value={block.npc}
            onChange={(npc) => patchBlock(beat.id, block.id, (x) => ({ ...x, npc }))}
            campaignId={campaignId}
            onCreateObject={onCreateObject}
          />
        )}
        <BlockEditor
          content={block.content}
          onChange={(html) => patchBlock(beat.id, block.id, (x) => ({ ...x, content: html }))}
          placeholder={block.type === 'npc' ? 'One talking point per bullet…' : `Add ${blockLabel(block.type).replace(/^\S+\s/, '').toLowerCase()}…`}
          campaignId={campaignId}
          onCreateObject={onCreateObject}
        />
        {(block.type === 'art' || (block.type === 'music' && !campaignId)) && (
          <input
            className="nb-input nb-url"
            placeholder={block.type === 'art' ? 'Paste image URL' : 'Paste music URL'}
            value={block.url ?? ''}
            onChange={(e) => patchBlock(beat.id, block.id, (x) => ({ ...x, url: e.target.value }))}
          />
        )}
        {block.type === 'art' && block.url && (
          <img className="nb-art" src={block.url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
      </section>
    );
  };

  // ---------------- beats ----------------

  const renderBeat = (beat: Beat, bi: number) => {
    const isOpen = open.has(beat.id);
    return (
      <article key={beat.id} className={`nb-beat ${beat.done ? 'is-done' : ''} ${isOpen ? 'is-open' : ''}`}>
        <div className="nb-beat-head">
          <input
            type="checkbox" className="nb-check" checked={beat.done} title="Mark beat complete"
            onChange={(e) => patchBeat(beat.id, (b) => ({ ...b, done: e.target.checked }))}
          />
          {!run && isOpen ? (
            <input
              className="nb-beat-title-input" value={beat.title} aria-label="Beat title"
              onChange={(e) => patchBeat(beat.id, (b) => ({ ...b, title: e.target.value }))}
            />
          ) : (
            <button type="button" className="nb-beat-title" onClick={() => toggleOpen(beat.id)}>{beat.title || 'Untitled beat'}</button>
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
            {beat.blocks.map((x, ki) => renderBlock(beat, bi, x, ki))}
            {!beat.blocks.length && !run && <div className="nb-empty">A blank page. Add whatever this beat needs.</div>}
            {!run && (
              <>
                <div className="nb-addline">
                  <button type="button" className="nb-btn nb-btn--primary"
                    onClick={() => setPalette(palette === beat.id ? null : beat.id)}>＋ Content</button>
                  <button type="button" className="nb-btn" onClick={() => addBeat(bi)}>＋ Beat after</button>
                </div>
                {palette === beat.id && (
                  <div className="nb-palette">
                    {BLOCK_TYPES.map((t) => (
                      <button key={t.type} type="button" className="nb-btn nb-btn--sm" title={t.hint}
                        onClick={() => addBlock(beat.id, t.type)}>{t.label}</button>
                    ))}
                  </div>
                )}
              </>
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
        onClick={() => { setRun((r) => !r); setPalette(null); setConfirm(null); }}>
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
      {visibleScenes.map((s) => (
        <button key={s.id} type="button" className={`nb-scene-btn ${s.id === scene.id ? 'is-active' : ''}`} onClick={() => pickScene(s.id)}>
          {s.title}<span>{s.beats.length} beats</span>
        </button>
      ))}
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
              {compact && <button type="button" className="nb-btn nb-btn--sm" onClick={addScene}>＋ Scene</button>}
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
          {!run && !scene.beats.length && (
            <button type="button" className="nb-btn nb-btn--primary" onClick={() => addBeat(-1)}>＋ Add beat</button>
          )}
        </div>
      </div>
    </div>
  );
}
