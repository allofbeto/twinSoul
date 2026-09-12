import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCampaigns, getSessions, getMonsters, getItems, createEncounter } from '../../../api/backendHelpers';
import PhaseBuilder from './Components/PhaseBuilder';
import type { BestiaryOption, CombatantRow, HomebrewOption, PhaseRow, SessionOption } from './Components/types';

interface Campaign {
  id: string;
  name: string;
}

let phaseUid = 0;
const nextPhaseKey = () => `phase-${Date.now()}-${phaseUid++}`;

const NewEncounter = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [bestiary, setBestiary] = useState<BestiaryOption[]>([]);
  const [homebrew, setHomebrew] = useState<HomebrewOption[]>([]);
  const [name, setName] = useState('');
  const [campaignId, setCampaignId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [phases, setPhases] = useState<PhaseRow[]>([
    { key: nextPhaseKey(), name: 'Phase 1', position: 0, combatants: [] },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [campaignsRes, sessionsRes, monstersRes, itemsRes] = await Promise.all([
          getCampaigns(),
          getSessions(),
          getMonsters(),
          getItems(),
        ]);
        setCampaigns(campaignsRes.data);
        setSessions(sessionsRes.data);
        setBestiary(monstersRes.data);
        setHomebrew(itemsRes.data.filter((i: HomebrewOption) => i.kind === 'monster' || i.kind === 'npc'));
      } catch {
        // Standalone encounters are still fine without campaigns loaded.
      }
    };
    fetch();
  }, []);

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
  };

  const updatePhase = (key: string, patch: Partial<PhaseRow>) =>
    setPhases((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const addPhase = () =>
    setPhases((prev) => [
      ...prev,
      { key: nextPhaseKey(), name: `Phase ${prev.length + 1}`, position: prev.length, combatants: [] },
    ]);

  const removePhase = (key: string) => setPhases((prev) => prev.filter((p) => p.key !== key));

  const addCombatant = (phaseKey: string, row: CombatantRow) =>
    setPhases((prev) =>
      prev.map((p) => (p.key === phaseKey ? { ...p, combatants: [...p.combatants, row] } : p))
    );

  const changeQuantity = (phaseKey: string, rowKey: string, quantity: number) =>
    setPhases((prev) =>
      prev.map((p) =>
        p.key === phaseKey
          ? { ...p, combatants: p.combatants.map((c) => (c.key === rowKey ? { ...c, quantity } : c)) }
          : p
      )
    );

  const removeCombatant = (phaseKey: string, rowKey: string) =>
    setPhases((prev) =>
      prev.map((p) =>
        p.key === phaseKey ? { ...p, combatants: p.combatants.filter((c) => c.key !== rowKey) } : p
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await createEncounter({
        name: name.trim(),
        campaign_id: campaignId || null,
        session_id: sessionId || null,
        notes: notes.trim() || null,
        encounter_phases_attributes: phases.map((p, idx) => ({
          name: p.name,
          position: idx,
          notes: p.notes?.trim() || null,
          encounter_monsters_attributes: p.combatants.map((c) => ({
            monster_id: c.monster_id || null,
            item_id: c.item_id || null,
            name: c.name,
            challenge_rating: c.challenge_rating || null,
            xp: c.xp,
            quantity: c.quantity,
          })),
        })),
      });
      navigate(`/dashboard/encounters/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-theme mb-1">New Encounter</h2>
      <p className="text-muted-theme mb-4">Assemble combatants and check the difficulty before you run it.</p>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card-theme p-4 mb-4">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label text-muted-theme">Name</label>
              <input
                type="text"
                className="form-control input-theme"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setSessionId(e.target.value)}
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
                placeholder="Tactics, read-aloud text, terrain..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {phases.map((phase, idx) => (
          <PhaseBuilder
            key={phase.key}
            phase={phase}
            index={idx}
            bestiary={bestiary}
            homebrew={homebrew}
            campaignId={campaignId || null}
            canRemove={phases.length > 1}
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

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-theme-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Encounter'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/dashboard/encounters')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewEncounter;
