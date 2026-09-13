import type { InitiativeState, StagedAsset } from './types';
import CombatTracker from './CombatTracker';

interface EncounterTakeoverProps {
  asset: StagedAsset;
  readOnly?: boolean;
  onMinimize?: () => void;
  onEnd?: () => void;
  onRollInitiative?: (asset: StagedAsset) => void;
  onViewMonster?: (monsterId: string) => void;
  /** DM-only: the live initiative tracker, embedded full-height below the
   * encounter summary instead of tucked away in the sidenav flyout. */
  initiative?: InitiativeState;
}

export default function EncounterTakeover({
  asset, readOnly = false, onMinimize, onEnd, onRollInitiative, onViewMonster, initiative,
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
              {asset.subtitle && (
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

          {combatants.length > 0 && (
            <div className="theatre__encounter-takeover-tags">
              {combatants.map((m, i) => (
                <span className="theatre__tag theatre__encounter-monster-tag" key={`${m.name}-${i}`}>
                  {m.quantity > 1 ? `${m.name} ×${m.quantity}` : m.name}
                  {!readOnly && onViewMonster && m.monsterId && (
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

        {!readOnly && initiative && (
          <div className="theatre__encounter-takeover-initiative">
            <CombatTracker initiative={initiative} />
          </div>
        )}
      </div>
    </div>
  );
}
