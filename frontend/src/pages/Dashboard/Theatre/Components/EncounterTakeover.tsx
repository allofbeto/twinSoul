import type { StagedAsset } from './types';

interface EncounterTakeoverProps {
  asset: StagedAsset;
  readOnly?: boolean;
  onMinimize?: () => void;
  onEnd?: () => void;
  onRollInitiative?: (asset: StagedAsset) => void;
  onViewMonster?: (monsterId: string) => void;
}

export default function EncounterTakeover({
  asset, readOnly = false, onMinimize, onEnd, onRollInitiative, onViewMonster,
}: EncounterTakeoverProps) {
  const combatants = asset.combatants ?? [];

  return (
    <div className="theatre__encounter-takeover">
      {!readOnly && onMinimize && (
        <button
          type="button"
          className="theatre__encounter-takeover-minimize"
          onClick={onMinimize}
          aria-label="Minimize encounter"
          data-tooltip="Minimize"
        >
          <i className="bx bx-minus" aria-hidden="true" />
        </button>
      )}

      <div className="theatre__encounter-takeover-card">
        <div className="theatre__encounter-takeover-head">
          <div className="theatre__encounter-takeover-head-row">
            <div className="theatre__encounter-takeover-heading">
              <h1 className="theatre__encounter-takeover-title">{asset.title}</h1>
              {/* Subtitle carries DM notes (escalation triggers, etc.) — DM-only. */}
              {!readOnly && asset.subtitle && (
                <p className="theatre__encounter-takeover-sub">{asset.subtitle}</p>
              )}
            </div>

            {!readOnly && (
              <div className="theatre__encounter-takeover-actions">
                {onRollInitiative && combatants.length > 0 && (
                  <button type="button" className="theatre__btn" onClick={() => onRollInitiative(asset)}>
                    ⚔ Roll Initiative
                  </button>
                )}
                {onEnd && (
                  <button type="button" className="theatre__btn theatre__btn--ghost" onClick={onEnd}>
                    End Encounter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* The monster list is DM-only — players learn who's here from the
             initiative order instead, redacted until revealed. */}
          {!readOnly && combatants.length > 0 && (
            <div className="theatre__encounter-takeover-tags">
              {combatants.map((m, i) => (
                <span className="theatre__tag theatre__encounter-monster-tag" key={`${m.name}-${i}`}>
                  {m.quantity > 1 ? `${m.name} ×${m.quantity}` : m.name}
                  {onViewMonster && m.monsterId && (
                    <button
                      type="button"
                      className="theatre__encounter-monster-view"
                      onClick={() => onViewMonster(m.monsterId!)}
                      aria-label={`View ${m.name} details`}
                    >
                      <i className="bx bx-show" aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
