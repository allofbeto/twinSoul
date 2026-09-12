import React, { useEffect, useMemo, useState } from 'react';
import { getCampaignCharacters } from '../../../../api/backendHelpers';
import { encounterMultiplier, difficultyFor, Difficulty } from '../constants';
import type { CombatantRow } from './types';

interface Props {
  combatants: CombatantRow[];
  campaignId: string | null;
  onQuantityChange: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onView: (combatant: CombatantRow) => void;
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  Trivial: '#6c757d',
  Easy: '#2e9e5b',
  Medium: '#d6a628',
  Hard: '#e07b28',
  Deadly: '#c0392b',
};

const SOURCE_LABEL: Record<CombatantRow['source'], string> = {
  bestiary: 'Bestiary',
  homebrew: 'Homebrew',
  custom: 'Custom',
};

const DifficultyPanel = ({ combatants, campaignId, onQuantityChange, onRemove, onView }: Props) => {
  const [partyLevels, setPartyLevels] = useState<number[]>([]);

  useEffect(() => {
    if (!campaignId) {
      setPartyLevels([]);
      return;
    }
    const fetch = async () => {
      try {
        const res = await getCampaignCharacters(campaignId);
        setPartyLevels(res.data.map((c: { level: number }) => c.level));
      } catch {
        setPartyLevels([]);
      }
    };
    fetch();
  }, [campaignId]);

  const live = combatants.filter((c) => !c._destroy);
  const monsterCount = live.reduce((sum, c) => sum + c.quantity, 0);
  const totalXp = live.reduce((sum, c) => sum + c.xp * c.quantity, 0);
  const multiplier = useMemo(
    () => encounterMultiplier(monsterCount, partyLevels.length),
    [monsterCount, partyLevels.length]
  );
  const adjustedXp = Math.round(totalXp * multiplier);
  const difficulty = useMemo(() => difficultyFor(adjustedXp, partyLevels), [adjustedXp, partyLevels]);

  return (
    <div className="card-theme p-4">
      <h5 className="text-theme mb-3">Encounter Budget</h5>

      {live.length === 0 ? (
        <p className="text-muted-theme mb-3" style={{ fontSize: '0.85rem' }}>
          No combatants yet. Add some from the bestiary, your homebrew, or a custom entry.
        </p>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3">
          {live.map((c) => (
            <div key={c.key} className="d-flex align-items-center gap-2">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="text-theme" style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div className="text-muted-theme" style={{ fontSize: '0.75rem' }}>
                  {SOURCE_LABEL[c.source]}{c.challenge_rating ? ` · CR ${c.challenge_rating}` : ''} · {c.xp.toLocaleString()} xp ea.
                </div>
              </div>
              {c.monster_id && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onView(c)}
                  title="View details"
                  aria-label={`View details for ${c.name}`}
                >
                  <i className="bx bx-show" />
                </button>
              )}
              <input
                type="number"
                min={1}
                className="form-control input-theme"
                style={{ width: '56px' }}
                value={c.quantity}
                onChange={(e) => onQuantityChange(c.key, Math.max(1, parseInt(e.target.value) || 1))}
              />
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onRemove(c.key)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <hr className="my-2" />

      <div className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between">
          <span className="text-muted-theme">Monsters</span>
          <span className="text-theme">{monsterCount}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted-theme">Total XP</span>
          <span className="text-theme">{totalXp.toLocaleString()}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted-theme">Multiplier</span>
          <span className="text-theme">×{multiplier}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted-theme">Adjusted XP</span>
          <span className="text-theme fw-bold">{adjustedXp.toLocaleString()}</span>
        </div>
        <hr className="my-2" />
        {campaignId ? (
          partyLevels.length > 0 ? (
            <>
              <div className="d-flex justify-content-between">
                <span className="text-muted-theme">Party</span>
                <span className="text-theme">
                  {partyLevels.length} {partyLevels.length === 1 ? 'character' : 'characters'}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted-theme">Difficulty</span>
                <span
                  className="badge-cls"
                  style={{ background: DIFFICULTY_COLOR[difficulty], color: '#fff' }}
                >
                  {difficulty}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>
              This campaign has no characters yet, so difficulty can't be estimated.
            </p>
          )
        ) : (
          <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>
            Attach a campaign to estimate difficulty against its party.
          </p>
        )}
      </div>
    </div>
  );
};

export default DifficultyPanel;
