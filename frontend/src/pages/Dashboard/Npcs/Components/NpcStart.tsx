import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { draftNpc } from '../../../../api/backendHelpers';
import { CR_OPTIONS, ROLES, type Role } from '../crDefaults';
import '../../../../styles/npcBuilder.css';

interface Props {
  /** An AI draft, in the shape of an NPC from the API. */
  onDraft: (npc: any) => void;
  /** Start from CR and role defaults. */
  onScratch: (cr: string, role: Role | null) => void;
}

const EXAMPLES = [
  'A nervous halfling tax collector who is secretly a cultist',
  'A retired dwarf blacksmith with a bad temper and a soft spot for strays',
  'A silver-tongued smuggler captain who owes the wrong people',
];

const MAX = 600;

// The first step of a new NPC: say who they are, pick a CR and a role, then
// either have the AI draft the whole thing or start from sensible numbers.
export default function NpcStart({ onDraft, onScratch }: Props) {
  const navigate = useNavigate();
  const [concept, setConcept] = useState('');
  const [cr, setCr] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  const draft = async () => {
    setDrafting(true);
    setError('');
    try {
      const res = await draftNpc({ concept: concept.trim(), cr: cr || undefined, role: role || undefined });
      setRemaining(res.data.remaining);
      onDraft(res.data.npc);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not draft that NPC. Try again, or start from scratch.');
      setDrafting(false);
    }
  };

  const canDraft = concept.trim().length >= 3 && !drafting;

  return (
    <div className="npcs-start">
      <div className="npcs-start-head">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/dashboard/npcs')}>← NPCs</button>
        <h2>New NPC</h2>
      </div>

      <label className="npcs-start-label" htmlFor="npc-concept">Who are they?</label>
      <textarea
        id="npc-concept"
        className="form-control input-theme"
        rows={3}
        maxLength={MAX}
        placeholder="A sentence or two is plenty…"
        value={concept}
        disabled={drafting}
        onChange={(e) => setConcept(e.target.value)}
      />
      <div className="npcs-start-examples" aria-label="Examples">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" disabled={drafting} onClick={() => setConcept(e)}>{e}</button>
        ))}
      </div>

      <div className="npcs-start-grid">
        <label>
          <span className="npcs-start-label">Challenge rating</span>
          <select className="form-select input-theme" value={cr} disabled={drafting} onChange={(e) => setCr(e.target.value)}>
            <option value="">Let the AI choose (1/2 from scratch)</option>
            {CR_OPTIONS.map((c) => <option key={c} value={c}>CR {c}</option>)}
          </select>
        </label>
      </div>

      <span className="npcs-start-label">Role at the table <em>(optional)</em></span>
      <div className="npcs-start-roles" role="group" aria-label="Role">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={role === r.key ? 'is-on' : ''}
            aria-pressed={role === r.key}
            disabled={drafting}
            onClick={() => setRole(role === r.key ? null : r.key)}
          >
            <strong>{r.label}</strong>
            <span>{r.hint}</span>
          </button>
        ))}
      </div>

      {error && <p className="npcs-start-error" role="alert">{error}</p>}

      <div className="npcs-start-actions">
        <button type="button" className="btn btn-theme-primary" disabled={!canDraft} onClick={draft}>
          {drafting ? 'Drafting… this can take 20 seconds' : '✨ Draft with AI'}
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={drafting} onClick={() => onScratch(cr || '1/2', role)}>
          Start from scratch
        </button>
      </div>
      <p className="npcs-start-note">
        The AI draws up stats, actions, personality and hooks for you to read over. Nothing is saved until you create the NPC.
        {remaining !== null && ` ${remaining} draft${remaining === 1 ? '' : 's'} left today.`}
      </p>
    </div>
  );
}
