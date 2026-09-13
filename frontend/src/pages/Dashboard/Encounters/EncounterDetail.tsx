import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getEncounter,
  updateEncounter,
  deleteEncounter,
  getCampaigns,
  getSessions,
  getMonsters,
  getItems,
} from '../../../api/backendHelpers';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PhaseBuilder from './Components/PhaseBuilder';
import type { BestiaryOption, CombatantRow, HomebrewOption, PhaseRow, SessionOption } from './Components/types';

interface Campaign {
  id: string;
  name: string;
}

interface EncounterMonsterDto {
  id: string;
  monster_id: string | null;
  item_id: string | null;
  name: string;
  challenge_rating: string | null;
  xp: number;
  max_hp: number | null;
  armor_class: number | null;
  quantity: number;
}

interface EncounterPhaseDto {
  id: string;
  name: string;
  position: number;
  notes: string | null;
  encounter_monsters: EncounterMonsterDto[];
}

interface EncounterDto {
  id: string;
  name: string;
  notes: string | null;
  campaign_id: string | null;
  session_id: string | null;
  encounter_phases: EncounterPhaseDto[];
}

const toRow = (m: EncounterMonsterDto): CombatantRow => ({
  key: m.id,
  id: m.id,
  monster_id: m.monster_id,
  item_id: m.item_id,
  name: m.name,
  challenge_rating: m.challenge_rating || undefined,
  xp: m.xp,
  max_hp: m.max_hp,
  armor_class: m.armor_class,
  quantity: m.quantity,
  source: m.monster_id ? 'bestiary' : m.item_id ? 'homebrew' : 'custom',
});

const toPhase = (p: EncounterPhaseDto): PhaseRow => ({
  key: p.id,
  id: p.id,
  name: p.name,
  position: p.position,
  notes: p.notes || undefined,
  combatants: p.encounter_monsters.map(toRow),
});

let phaseUid = 0;
const nextPhaseKey = () => `phase-${Date.now()}-${phaseUid++}`;

const AUTOSAVE_DELAY = 800;

type SaveStatus = 'idle' | 'saving' | 'saved';

const EncounterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [bestiary, setBestiary] = useState<BestiaryOption[]>([]);
  const [homebrew, setHomebrew] = useState<HomebrewOption[]>([]);
  const [name, setName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [notes, setNotes] = useState('');
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [encounterRes, campaignsRes, sessionsRes, monstersRes, itemsRes] = await Promise.all([
          getEncounter(id!),
          getCampaigns(),
          getSessions(),
          getMonsters(),
          getItems(),
        ]);
        const encounter: EncounterDto = encounterRes.data;
        setName(encounter.name);
        setCampaignId(encounter.campaign_id || '');
        setSessionId(encounter.session_id || '');
        setNotes(encounter.notes || '');
        setPhases(
          [...encounter.encounter_phases]
            .sort((a, b) => a.position - b.position)
            .map(toPhase)
        );
        setCampaigns(campaignsRes.data);
        setSessions(sessionsRes.data);
        setBestiary(monstersRes.data);
        setHomebrew(itemsRes.data.filter((i: HomebrewOption) => i.kind === 'monster' || i.kind === 'npc'));
      } catch {
        setError('Could not load encounter.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus('saving');
  };

  const visiblePhases = phases.filter((p) => !p._destroy);

  const availableSessions = useMemo(
    () => sessions.filter((s) => (campaignId ? s.campaign_id === campaignId : !s.campaign_id)),
    [sessions, campaignId]
  );

  const handleCampaignChange = (newCampaignId: string) => {
    setCampaignId(newCampaignId);
    const stillValid = sessions.some(
      (s) => s.id === sessionId && (newCampaignId ? s.campaign_id === newCampaignId : !s.campaign_id)
    );
    if (!stillValid) setSessionId('');
    markDirty();
  };

  const updatePhase = (key: string, patch: Partial<PhaseRow>) => {
    setPhases((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
    markDirty();
  };

  const addPhase = () => {
    setPhases((prev) => [
      ...prev,
      { key: nextPhaseKey(), name: `Phase ${visiblePhases.length + 1}`, position: prev.length, combatants: [] },
    ]);
    markDirty();
  };

  // Persisted phases must stay in the array (flagged _destroy) so the nested
  // attributes payload tells the backend to delete them; unsaved ones can
  // just be dropped outright.
  const removePhase = (key: string) => {
    setPhases((prev) =>
      prev
        .map((p) => (p.key === key ? { ...p, _destroy: true } : p))
        .filter((p) => p.key !== key || p.id)
    );
    markDirty();
  };

  const addCombatant = (phaseKey: string, row: CombatantRow) => {
    setPhases((prev) =>
      prev.map((p) => (p.key === phaseKey ? { ...p, combatants: [...p.combatants, row] } : p))
    );
    markDirty();
  };

  const changeQuantity = (phaseKey: string, rowKey: string, quantity: number) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.key === phaseKey
          ? { ...p, combatants: p.combatants.map((c) => (c.key === rowKey ? { ...c, quantity } : c)) }
          : p
      )
    );
    markDirty();
  };

  const removeCombatant = (phaseKey: string, rowKey: string) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.key === phaseKey
          ? {
              ...p,
              combatants: p.combatants
                .map((c) => (c.key === rowKey ? { ...c, _destroy: true } : c))
                .filter((c) => c.key !== rowKey || c.id),
            }
          : p
      )
    );
    markDirty();
  };

  // After a save, newly-created phases/monsters come back with real ids.
  // Fold those ids into local state (by position, matching what was just
  // sent) without touching anything else, so the next autosave updates
  // those records instead of re-creating duplicates. Local `key`s are left
  // alone so React doesn't remount anything mid-edit.
  const applyServerIds = (dto: EncounterDto) => {
    const sortedPhases = [...dto.encounter_phases].sort((a, b) => a.position - b.position);
    let phaseCursor = 0;
    setPhases((prev) =>
      prev.map((p) => {
        if (p._destroy) return p;
        const respPhase = sortedPhases[phaseCursor];
        phaseCursor += 1;
        if (!respPhase) return p;

        let monsterCursor = 0;
        const combatants = p.combatants.map((c) => {
          if (c._destroy) return c;
          const respMonster = respPhase.encounter_monsters[monsterCursor];
          monsterCursor += 1;
          return !c.id && respMonster ? { ...c, id: respMonster.id } : c;
        });

        return !p.id ? { ...p, id: respPhase.id, combatants } : { ...p, combatants };
      })
    );
  };

  const handleSave = async () => {
    try {
      let position = 0;
      const encounter_phases_attributes = phases.map((p) => {
        if (p._destroy) return { id: p.id, _destroy: true };
        const payload = {
          id: p.id,
          name: p.name,
          position,
          notes: p.notes?.trim() || null,
          encounter_monsters_attributes: p.combatants.map((c) => ({
            id: c.id,
            monster_id: c.monster_id || null,
            item_id: c.item_id || null,
            name: c.name,
            challenge_rating: c.challenge_rating || null,
            xp: c.xp,
            max_hp: c.max_hp ?? null,
            armor_class: c.armor_class ?? null,
            quantity: c.quantity,
            _destroy: c._destroy || undefined,
          })),
        };
        position += 1;
        return payload;
      });

      const res = await updateEncounter(id!, {
        name: name.trim(),
        campaign_id: campaignId || null,
        session_id: sessionId || null,
        notes: notes.trim() || null,
        encounter_phases_attributes,
      });
      applyServerIds(res.data);
      setPhases((prev) =>
        prev
          .filter((p) => !p._destroy)
          .map((p) => ({ ...p, combatants: p.combatants.filter((c) => !c._destroy) }))
      );
      setIsDirty(false);
      setSaveStatus('saved');
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Could not save changes.');
      setSaveStatus('idle');
    }
  };

  // Autosave: fires AUTOSAVE_DELAY after the last change.
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => { handleSave(); }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, campaignId, sessionId, notes, phases, isDirty]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEncounter(id!);
      navigate('/dashboard/encounters');
    } catch {
      setError('Could not delete encounter.');
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate('/dashboard/encounters')}
        >
          ← Back
        </button>
        <div className="d-flex align-items-center gap-2">
          {saveStatus === 'saving' && <span className="save-status save-status-saving">Saving...</span>}
          {saveStatus === 'saved' && <span className="save-status save-status-saved">Saved!</span>}
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card-theme p-4 mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label text-muted-theme">Name</label>
            <input
              type="text"
              className="form-control input-theme"
              value={name}
              onChange={(e) => { setName(e.target.value); markDirty(); }}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted-theme">Campaign</label>
            <select
              className="form-select input-theme"
              value={campaignId}
              onChange={(e) => handleCampaignChange(e.target.value)}
            >
              <option value="">Standalone (no campaign)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted-theme">Session</label>
            <select
              className="form-select input-theme"
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); markDirty(); }}
              disabled={availableSessions.length === 0}
            >
              <option value="">
                {availableSessions.length === 0 ? 'No matching sessions' : 'No session'}
              </option>
              {availableSessions.map((s) => (
                <option key={s.id} value={s.id}>#{s.session_number} — {s.title}</option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label text-muted-theme">Notes</label>
            <textarea
              className="form-control input-theme"
              rows={2}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); markDirty(); }}
            />
          </div>
        </div>
      </div>

      {visiblePhases.map((phase, idx) => (
        <PhaseBuilder
          key={phase.key}
          phase={phase}
          index={idx}
          bestiary={bestiary}
          homebrew={homebrew}
          campaignId={campaignId || null}
          canRemove={visiblePhases.length > 1}
          onChange={(patch) => updatePhase(phase.key, patch)}
          onRemove={() => removePhase(phase.key)}
          onAddCombatant={(row) => addCombatant(phase.key, row)}
          onQuantityChange={(rowKey, qty) => changeQuantity(phase.key, rowKey, qty)}
          onRemoveCombatant={(rowKey) => removeCombatant(phase.key, rowKey)}
        />
      ))}

      <button type="button" className="btn btn-outline-secondary mb-4" onClick={addPhase}>
        + Add Phase
      </button>

      <ConfirmDialog
        isOpen={showDelete}
        title="Delete Encounter"
        message={<>Are you sure you want to delete <strong className="text-theme">{name}</strong>? This cannot be undone.</>}
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default EncounterDetail;
