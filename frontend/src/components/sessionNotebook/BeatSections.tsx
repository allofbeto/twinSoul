import type { CreateCampaignObject } from '../formComponents/editor/CampaignObjectMention';
import { renderNotes } from '../../pages/Dashboard/Theatre/Components/sanitizeNotes';
import BlockEditor from './BlockEditor';
import NpcPicker from './NpcPicker';
import TrackPicker from './TrackPicker';
import TrackCard from './TrackCard';
import EncounterPicker from './EncounterPicker';
import { TrashIcon } from './Icons';
import type { Track } from './useTracks';
import { uid, type Beat, type SectionKey } from './model';

const NPC_STARTER = '<ul><li><p></p></li></ul>';

interface EditProps {
  beat: Beat;
  section: SectionKey;
  patch: (fn: (b: Beat) => Beat) => void;
  campaignId?: string;
  onCreateObject?: CreateCampaignObject;
  placeholder?: string;
}

/** The editing UI for one section of a beat. Shared by the beat view and the guided builder. */
const newNpc = (id = '', name = '') => ({ key: uid(), id, name, points: NPC_STARTER });

export function SectionEdit({ beat, section, patch, campaignId, onCreateObject, placeholder }: EditProps) {
  const editor = (key: 'read' | 'find' | 'branches' | 'note', ph: string) => (
    <BlockEditor
      content={beat[key]}
      onChange={(html) => patch((b) => ({ ...b, [key]: html }))}
      placeholder={placeholder ?? ph}
      campaignId={campaignId}
      onCreateObject={onCreateObject}
    />
  );

  switch (section) {
    case 'read': return editor('read', 'The mill wheel creaks though there\'s no wind…');
    case 'find': return editor('find', 'One per bullet…');
    case 'branches': return editor('branches', 'sneak in → surprise round…');
    case 'note': return editor('note', 'Only you see this…');
    case 'npcs': {
      const setNpc = (i: number, fn: (n: Beat['npcs'][number]) => Beat['npcs'][number]) =>
        patch((b) => ({ ...b, npcs: b.npcs.map((n, j) => (j === i ? fn(n) : n)) }));
      const addNpc = () => patch((b) => ({ ...b, npcs: [...b.npcs, newNpc()] }));
      const list = beat.npcs.length ? beat.npcs : null;
      return (
        <div className="nb-npcs">
          {(list ?? [newNpc()]).map((n, i) => (
            <div key={list ? n.key : 'new'} className="nb-npc-entry">
              <div className="nb-npc-entry-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NpcPicker
                    value={n.name ? { id: n.id, name: n.name } : undefined}
                    onChange={(ref) => {
                      if (!list) patch((b) => ({ ...b, npcs: [newNpc(ref?.id, ref?.name)] }));
                      else setNpc(i, (x) => ({ ...x, id: ref?.id ?? '', name: ref?.name ?? '' }));
                    }}
                    campaignId={campaignId}
                    onCreateObject={onCreateObject}
                  />
                </div>
                {list && (
                  <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm nb-btn--trash" aria-label="Remove NPC" title="Remove NPC"
                    onClick={() => patch((b) => ({ ...b, npcs: b.npcs.filter((_, j) => j !== i) }))}><TrashIcon /></button>
                )}
              </div>
              {list && (
                <BlockEditor
                  content={n.points}
                  onChange={(html) => setNpc(i, (x) => ({ ...x, points: html }))}
                  placeholder="What they want, what they know — one point per bullet…"
                  campaignId={campaignId}
                  onCreateObject={onCreateObject}
                />
              )}
            </div>
          ))}
          {list && <button type="button" className="nb-btn nb-btn--sm" onClick={addNpc}>＋ Another NPC</button>}
        </div>
      );
    }
    case 'stage':
      return (
        <div className="nb-stage-fields">
          <EncounterPicker campaignId={campaignId} value={beat.encounter} onChange={(encounter) => patch((b) => ({ ...b, encounter }))} />
          {beat.map && (
            <div className="nb-field-row">
              <span>🗺 Battle map</span>
              <span className="nb-chip nb-chip--art">{beat.map.name}</span>
              <button type="button" className="nb-btn nb-btn--ghost nb-btn--sm" onClick={() => patch((b) => ({ ...b, map: undefined }))}>Unlink</button>
            </div>
          )}
          <div className="nb-field-row">
            <span>♫ Music</span>
            {campaignId ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <TrackPicker
                  campaignId={campaignId}
                  trackId={beat.trackId}
                  legacyUrl={beat.musicUrl}
                  suggestedTitle={beat.title}
                  onLink={(trackId) => patch((b) => ({ ...b, trackId, ...(trackId ? { musicUrl: undefined } : {}) }))}
                />
              </div>
            ) : (
              <input className="nb-input" placeholder="Paste music URL" value={beat.musicUrl ?? ''}
                onChange={(e) => patch((b) => ({ ...b, musicUrl: e.target.value || undefined }))} />
            )}
          </div>
          <label className="nb-field-row">
            <span>▧ Art</span>
            <input className="nb-input" placeholder="Paste image URL" value={beat.artUrl ?? ''}
              onChange={(e) => patch((b) => ({ ...b, artUrl: e.target.value || undefined }))} />
          </label>
          {beat.artUrl && <img className="nb-art" src={beat.artUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        </div>
      );
  }
}

/** Read-only rendering of a filled section (run mode). */
export function SectionView({ beat, section, tracks }: { beat: Beat; section: SectionKey; tracks: Track[] }) {
  const html = (h: string) => <div className="nb-html" dangerouslySetInnerHTML={{ __html: renderNotes(h) }} />;
  switch (section) {
    case 'read': return html(beat.read);
    case 'find': return html(beat.find);
    case 'branches': return html(beat.branches);
    case 'note': return html(beat.note);
    case 'npcs':
      return (
        <>
          {beat.npcs.map((n, i) => (
            <div key={n.key ?? i} className="nb-npc-entry">
              {n.name && <span className="nb-npc-chip" data-id={n.id || undefined} data-kind={n.id ? 'npc' : undefined} data-label={n.name}>🧙 {n.name}</span>}
              {html(n.points)}
            </div>
          ))}
        </>
      );
    case 'stage': {
      const track = beat.trackId ? tracks.find((t) => t.id === beat.trackId) : undefined;
      return (
        <div className="nb-stage-fields">
          {beat.encounter && <div className="nb-chip nb-chip--fight">⚔ {beat.encounter.name}</div>}
          {beat.map && <div className="nb-chip nb-chip--art">🗺 {beat.map.name}</div>}
          {track && <TrackCard track={track} />}
          {!track && beat.musicUrl && <a href={beat.musicUrl} target="_blank" rel="noopener noreferrer">♫ Open music cue ↗</a>}
          {beat.artUrl && <img className="nb-art" src={beat.artUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        </div>
      );
    }
  }
}
