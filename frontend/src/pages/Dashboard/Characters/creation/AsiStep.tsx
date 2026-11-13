import React from 'react';
import { Feat } from '../featTypes';
import { ABILITY_KEYS, ABILITY_META, AbilityKey, AsiChoice, Scores, abilityKeyFromShort, asiIsComplete } from './builderData';

interface Props {
  choices: AsiChoice[];
  onChange: (choices: AsiChoice[]) => void;
  feats: Feat[];
  scores: Scores; // final scores including these choices
}

const KINDS: { key: NonNullable<AsiChoice['kind']>; label: string }[] = [
  { key: 'plus2', label: '+2 to one' },
  { key: 'split', label: '+1 to two' },
  { key: 'feat', label: 'Take a feat' },
];

// The improvements a character has earned by its starting level: for each,
// raise abilities or take a feat.
const AsiStep = ({ choices, onChange, feats, scores }: Props) => {
  if (choices.length === 0) return null;

  const update = (key: string, patch: Partial<AsiChoice>) =>
    onChange(choices.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const takenFeats = (except: string) => choices.filter((c) => c.key !== except && c.featIndex).map((c) => c.featIndex);
  const remaining = choices.filter((c) => !asiIsComplete(c)).length;
  const bySource = feats.reduce<Record<string, Feat[]>>((acc, f) => {
    const src = f.source || 'Other';
    (acc[src] = acc[src] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="builder-asi">
      <div className="builder-asi-head">
        <span className="race-section-label m-0">Ability Score Improvements</span>
        <span className={`builder-asi-count ${remaining ? 'is-pending' : ''}`}>
          {remaining ? `${remaining} to choose` : 'All chosen ✓'}
        </span>
      </div>
      <p className="builder-path-hint mt-0 mb-2">
        Your levels grant {choices.length === 1 ? 'an improvement' : `${choices.length} improvements`}: raise your abilities or learn a feat.
      </p>

      {choices.map((c) => {
        const feat = feats.find((f) => f.index === c.featIndex);
        const featAbilities = (feat?.ability_options || []).map(abilityKeyFromShort).filter(Boolean) as AbilityKey[];
        return (
          <div key={c.key} className={`builder-asi-card ${asiIsComplete(c) ? 'is-done' : ''}`}>
            <div className="builder-asi-title">
              <strong>{c.className} {c.classLevel}</strong>
              <div className="builder-asi-kinds" role="group" aria-label={`${c.className} ${c.classLevel} improvement`}>
                {KINDS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    className={`race-filter ${c.kind === k.key ? 'is-active' : ''}`}
                    onClick={() => update(c.key, { kind: k.key, first: null, second: null, featIndex: null, featAbility: null })}
                    aria-pressed={c.kind === k.key}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {(c.kind === 'plus2' || c.kind === 'split') && (
              <div className="builder-asi-abilities">
                {ABILITY_KEYS.map((k) => {
                  const picked = c.first === k || c.second === k;
                  const atCap = scores[k] >= 20 && !picked;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`builder-asi-ability ${picked ? 'is-picked' : ''}`}
                      disabled={atCap}
                      aria-pressed={picked}
                      onClick={() => {
                        if (c.kind === 'plus2') return update(c.key, { first: c.first === k ? null : k });
                        if (picked) return update(c.key, c.first === k ? { first: c.second, second: null } : { second: null });
                        if (!c.first) return update(c.key, { first: k });
                        return update(c.key, { second: k });
                      }}
                    >
                      <small>{ABILITY_META[k].short}</small>
                      {scores[k]}
                    </button>
                  );
                })}
              </div>
            )}

            {c.kind === 'feat' && (
              <div className="builder-asi-feat">
                <select
                  className="form-select input-theme"
                  value={c.featIndex || ''}
                  onChange={(e) => {
                    const next = feats.find((f) => f.index === e.target.value);
                    const options = (next?.ability_options || []).map(abilityKeyFromShort).filter(Boolean) as AbilityKey[];
                    update(c.key, { featIndex: e.target.value || null, featAbility: options[0] || null });
                  }}
                  aria-label="Choose a feat"
                >
                  <option value="">Choose a feat…</option>
                  {Object.entries(bySource).map(([source, list]) => (
                    <optgroup key={source} label={source}>
                      {list.map((f) => (
                        <option key={f.index} value={f.index} disabled={takenFeats(c.key).includes(f.index)}>
                          {f.name}{f.ability_bonus ? ' (+1)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {feat && (
                  <div className="builder-asi-feat-info">
                    <p className="mb-1">{feat.desc[0]}</p>
                    {feat.prerequisite && <small>Requires {feat.prerequisite}</small>}
                    {featAbilities.length > 1 && (
                      <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                        <small>+1 to</small>
                        {featAbilities.map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`race-filter ${c.featAbility === k ? 'is-active' : ''}`}
                            onClick={() => update(c.key, { featAbility: k })}
                            aria-pressed={c.featAbility === k}
                          >
                            {ABILITY_META[k].short}
                          </button>
                        ))}
                      </div>
                    )}
                    {featAbilities.length === 1 && <small className="d-block mt-1">Also raises {ABILITY_META[featAbilities[0]].name} by 1.</small>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AsiStep;
