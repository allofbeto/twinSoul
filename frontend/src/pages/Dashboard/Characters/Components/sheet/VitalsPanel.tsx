import React, { useState } from 'react';
import { HitDiePool } from '../../sheetRules';
import { NumberField, OverridableNumber } from './fields';

export interface VitalsValues {
  current_hp: number;
  max_hp: number;
  temp_hp: number;
  armor_class: number;
  temp_ac_bonus: number;
  inspo: number;
  death_save_successes: number;
  death_save_failures: number;
}

/** A calculated number the table can overrule (see sheetRules Overrides). */
export interface DerivedStat {
  key: string; // override key, or 'speed' (its own column)
  label: string;
  auto: number;
  value: number | undefined;
  signed?: boolean;
  suffix?: string;
}

interface Props {
  values: VitalsValues;
  /** Initiative, speed, proficiency, passive Perception... */
  stats: DerivedStat[];
  onStatChange: (stat: DerivedStat, value: number | null) => void;
  hitDice: HitDiePool[];
  isOwner: boolean;
  /** Every edit, with a short name for the undo button ("max HP"). */
  onChange: (patch: Partial<VitalsValues>, label: string) => void;
  onDamage: (amount: number) => void;
  onHeal: (amount: number) => void;
  onShortRest?: () => void;
  onLongRest?: () => void;
  onLevelUp?: () => void;
  canLevelUp: boolean;
}

const toInt = (v: string) => parseInt(v, 10) || 0;
// Big HP inputs hug their number so "30 / 38" reads as one value.
const fitDigits = (n: number) => `${Math.max(1, String(n).length) + 0.4}ch`;

const DeathSaves = ({ successes, failures, isOwner, onChange }: {
  successes: number; failures: number; isOwner: boolean;
  onChange: (patch: Partial<VitalsValues>, label: string) => void;
}) => {
  const row = (label: string, count: number, field: 'death_save_successes' | 'death_save_failures', tone: string) => (
    <div className="sheet-deathsave-row">
      <span className="sheet-deathsave-label">{label}</span>
      {[0, 1, 2].map((i) => (
        <button
          key={i}
          type="button"
          className={`sheet-pip sheet-pip--${tone} ${i < count ? 'is-filled' : ''}`}
          disabled={!isOwner}
          onClick={() => onChange({ [field]: i < count ? i : i + 1 }, 'death save')}
          aria-label={`${label} ${i + 1}`}
        />
      ))}
    </div>
  );

  const status = successes >= 3 ? 'Stable' : failures >= 3 ? 'Dead' : 'Dying';

  return (
    <div className="sheet-deathsaves">
      <div className="sheet-deathsaves-title">Death Saves <span className={`sheet-deathsaves-status is-${status.toLowerCase()}`}>{status}</span></div>
      {row('Successes', successes, 'death_save_successes', 'success')}
      {row('Failures', failures, 'death_save_failures', 'danger')}
    </div>
  );
};

const VitalsPanel = ({
  values, stats, onStatChange, hitDice, isOwner,
  onChange, onDamage, onHeal, onShortRest, onLongRest, onLevelUp, canLevelUp,
}: Props) => {
  const [amount, setAmount] = useState('');
  const { current_hp, max_hp, temp_hp, armor_class, temp_ac_bonus, inspo } = values;
  const hpPercent = max_hp > 0 ? Math.min(100, (current_hp / max_hp) * 100) : 0;
  const hpTone = hpPercent <= 25 ? 'is-low' : hpPercent <= 50 ? 'is-mid' : '';
  const amountValue = toInt(amount);

  const apply = (fn: (n: number) => void) => {
    if (amountValue <= 0) return;
    fn(amountValue);
    setAmount('');
  };

  return (
    <section className="sheet-card sheet-vitals" aria-label="Vitals">
      <div className="sheet-hp">
        <div className="sheet-hp-head">
          <span className="sheet-label">Hit Points</span>
          {temp_hp > 0 && <span className="sheet-hp-temp-chip">+{temp_hp} temp</span>}
        </div>

        <div className="sheet-hp-numbers">
          <NumberField
            className="sheet-hp-current"
            style={{ width: fitDigits(current_hp) }}
            value={current_hp}
            min={0}
            onCommit={(n) => onChange({ current_hp: n }, 'HP')}
            disabled={!isOwner}
            aria-label="Current hit points"
          />
          <span className="sheet-hp-slash">/</span>
          <NumberField
            className="sheet-hp-max"
            style={{ width: fitDigits(max_hp) }}
            value={max_hp}
            min={0}
            onCommit={(n) => onChange({ max_hp: n }, 'max HP')}
            disabled={!isOwner}
            aria-label="Maximum hit points"
          />
          <label className="sheet-hp-temp">
            <span className="sheet-label">Temp</span>
            <NumberField
              value={temp_hp}
              min={0}
              onCommit={(n) => onChange({ temp_hp: n }, 'temp HP')}
              disabled={!isOwner}
              aria-label="Temporary hit points"
            />
          </label>
        </div>

        <div className="sheet-hp-bar" aria-hidden="true">
          <div className={`sheet-hp-bar-fill ${hpTone}`} style={{ width: `${hpPercent}%` }} />
        </div>

        {isOwner && (
          <div className="sheet-hp-adjust">
            <button type="button" className="sheet-btn sheet-btn--danger" onClick={() => apply(onDamage)} disabled={amountValue <= 0}>
              Damage
            </button>
            <input
              type="number"
              inputMode="numeric"
              className="sheet-hp-amount"
              placeholder="0"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              // Enter would otherwise submit the whole sheet.
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              aria-label="Amount of damage or healing"
            />
            <button type="button" className="sheet-btn sheet-btn--success" onClick={() => apply(onHeal)} disabled={amountValue <= 0}>
              Heal
            </button>
          </div>
        )}

        {current_hp === 0 && max_hp > 0 && (
          <DeathSaves
            successes={values.death_save_successes}
            failures={values.death_save_failures}
            isOwner={isOwner}
            onChange={onChange}
          />
        )}
      </div>

      <div className="sheet-stats">
        <div className="sheet-stat sheet-stat--ac">
          <span className="sheet-label">Armor Class</span>
          <NumberField
            className="sheet-stat-input"
            value={armor_class}
            min={0}
            max={40}
            onCommit={(n) => onChange({ armor_class: n }, 'AC')}
            disabled={!isOwner}
            aria-label="Armor class"
          />
          <label className="sheet-stat-temp">
            <span>temp</span>
            <NumberField
              value={temp_ac_bonus}
              min={-20}
              max={20}
              onCommit={(n) => onChange({ temp_ac_bonus: n }, 'temp AC')}
              disabled={!isOwner}
              aria-label="Temporary AC bonus"
            />
          </label>
          {temp_ac_bonus !== 0 && <span className="sheet-stat-hint">= {armor_class + temp_ac_bonus}</span>}
        </div>
        {stats.map((s) => (
          <div key={s.key} className="sheet-stat">
            <span className="sheet-label">{s.label}</span>
            <span className="sheet-stat-value">
              <OverridableNumber
                auto={s.auto}
                value={s.value}
                signed={s.signed}
                editable={isOwner}
                onChange={(v) => onStatChange(s, v)}
                aria-label={s.label}
              />
              {s.suffix && <small> {s.suffix}</small>}
            </span>
          </div>
        ))}
      </div>

      <div className="sheet-vitals-footer">
        {/* A count, not a toggle: plenty of tables let you bank more than one. */}
        <div className={`sheet-inspiration ${inspo > 0 ? 'is-on' : ''}`} role="group" aria-label={`Inspiration: ${inspo}`}>
          <span className="sheet-inspiration-star" aria-hidden="true">★</span>
          <span className="sheet-inspiration-label">Inspiration</span>
          {isOwner && (
            <button type="button" className="sheet-inspiration-btn" onClick={() => onChange({ inspo: Math.max(0, inspo - 1) }, 'inspiration')} disabled={inspo <= 0} aria-label="Spend inspiration">−</button>
          )}
          <strong className="sheet-inspiration-count">{inspo}</strong>
          {isOwner && (
            <button type="button" className="sheet-inspiration-btn" onClick={() => onChange({ inspo: inspo + 1 }, 'inspiration')} aria-label="Gain inspiration">+</button>
          )}
        </div>

        {hitDice.length > 0 && (
          <div className="sheet-hitdice" title="Hit dice left">
            <span className="sheet-label">Hit Dice</span>
            {hitDice.map((p) => (
              <span key={p.die} className="sheet-hitdice-pool">
                <strong>{p.total - p.used}</strong>/{p.total}{p.die}
              </span>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="sheet-vitals-actions">
            {onShortRest && <button type="button" className="sheet-btn" onClick={onShortRest}>Short Rest</button>}
            {onLongRest && <button type="button" className="sheet-btn" onClick={onLongRest}>Long Rest</button>}
            {onLevelUp && (
              <button type="button" className="sheet-btn sheet-btn--primary" onClick={onLevelUp} disabled={!canLevelUp}>
                Level Up
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default VitalsPanel;
