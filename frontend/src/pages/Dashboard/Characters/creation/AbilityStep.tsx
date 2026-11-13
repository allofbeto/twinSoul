import React, { useEffect, useRef, useState } from 'react';
import D20Die, { preloadDice } from './D20Die';
import { diceSoundOn, playFanfare, setDiceSound } from './diceSound';
import { CharClass } from '../classTypes';
import {
  ABILITY_KEYS,
  ABILITY_META,
  AbilityKey,
  BonusChoice,
  POINT_BUY_BUDGET,
  Scores,
  STANDARD_ARRAY,
  blankScores,
  classFlavor,
  modifier,
  pointCost,
  pointsSpent,
  rollAbility,
  signed,
  suggestedArray,
} from './builderData';

export type ScoreMethod = 'custom' | 'pointbuy' | 'roll';

export interface RollResult {
  dice: number[];
  dropAt: number;
  total: number;
}

interface Props {
  method: ScoreMethod;
  onMethodChange: (method: ScoreMethod) => void;
  base: Scores;
  onBaseChange: (scores: Scores) => void;
  rolls: RollResult[] | null;
  onRollsChange: (rolls: RollResult[] | null) => void;
  cls?: CharClass;
  primary?: AbilityKey[]; // key abilities across all chosen classes
  classLabel?: string; // e.g. "Fighter/Rogue"
  raceName?: string;
  fixedBonuses: Partial<Record<AbilityKey, number>>;
  choice: BonusChoice;
  chosen: (AbilityKey | null)[];
  onChosenChange: (chosen: (AbilityKey | null)[]) => void;
  finalScores: Scores;
}

const METHODS: { key: ScoreMethod; label: string; blurb: string }[] = [
  { key: 'custom', label: 'Custom', blurb: 'Set each score yourself, like stats rolled at the table.' },
  { key: 'pointbuy', label: 'Point Buy', blurb: `Spend ${POINT_BUY_BUDGET} points to shape every score.` },
  { key: 'roll', label: 'Roll the Dice', blurb: '4d6, drop the lowest. Fate decides.' },
];

const AbilityStep = (props: Props) => {
  const { method, base, cls, fixedBonuses, choice, chosen, finalScores } = props;
  const [swapFrom, setSwapFrom] = useState<AbilityKey | null>(null);
  const [rolling, setRolling] = useState(false);
  const primary = props.primary ?? (cls ? classFlavor(cls).primary : []);

  const switchMethod = (next: ScoreMethod) => {
    setSwapFrom(null);
    setRolling(false);
    setPending(null);
    setRollId(0);
    props.onMethodChange(next);
    if (next === 'custom') props.onBaseChange(suggestedArray(cls, STANDARD_ARRAY, primary));
    if (next === 'pointbuy') props.onBaseChange(blankScores(8));
    if (next === 'roll') {
      props.onRollsChange(null);
      props.onBaseChange(blankScores(10));
    }
  };

  // Tap one ability, then another, to swap their scores.
  const tapToSwap = (key: AbilityKey) => {
    if (method === 'pointbuy' || (method === 'roll' && !props.rolls)) return;
    if (!swapFrom) return setSwapFrom(key);
    if (swapFrom !== key) props.onBaseChange({ ...base, [swapFrom]: base[key], [key]: base[swapFrom] });
    setSwapFrom(null);
  };

  // Six d20s are thrown one after another; the scores apply once the last one lands.
  const [rollId, setRollId] = useState(0);
  const [pending, setPending] = useState<RollResult[] | null>(null);
  const settled = useRef(0);
  useEffect(() => {
    if (method === 'roll') preloadDice();
  }, [method]);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setSwapFrom(null);
    settled.current = 0;
    setPending(ABILITY_KEYS.map(() => rollAbility()));
    setRollId((n) => n + 1);
  };

  const onDieSettled = () => {
    settled.current += 1;
    if (settled.current < ABILITY_KEYS.length || !pending) return;
    props.onRollsChange(pending);
    props.onBaseChange(suggestedArray(cls, pending.map((r) => r.total), primary));
    setPending(null);
    setRolling(false);
    const sum = pending.reduce((n, r) => n + r.total, 0);
    if (sum >= 80 || pending.some((r) => r.total === 18)) playFanfare();
  };

  const [soundOn, setSoundOn] = useState(diceSoundOn);
  const toggleSound = () => {
    setDiceSound(!soundOn);
    setSoundOn(!soundOn);
  };

  const spent = pointsSpent(base);
  const adjust = (key: AbilityKey, delta: number) => {
    const next = base[key] + delta;
    if (next < 8 || next > 15) return;
    const trial = { ...base, [key]: next };
    if (pointsSpent(trial) > POINT_BUY_BUDGET) return;
    props.onBaseChange(trial);
  };

  const setChoice = (slot: number, key: AbilityKey | null) => {
    const next = [...chosen];
    next[slot] = key;
    props.onChosenChange(next);
  };


  const canSwap = method === 'roll' && !!props.rolls;

  // Which ability each rolled total ended up in (follows swaps).
  const assignment: string[] = [];
  if (props.rolls) {
    const used = new Set<AbilityKey>();
    props.rolls.forEach((r, i) => {
      const k = ABILITY_KEYS.find((key) => !used.has(key) && base[key] === r.total);
      if (k) {
        used.add(k);
        assignment[i] = ABILITY_META[k].short;
      }
    });
  }
  const verdict = props.rolls && (() => {
    const sum = props.rolls.reduce((n, r) => n + r.total, 0);
    const [word, tier] = sum >= 80 ? ['Heroic', 'heroic'] : sum >= 75 ? ['Blessed', 'great'] : sum >= 69 ? ['Solid', 'fair'] : sum >= 63 ? ['Humble', 'poor'] : ['Ill-fated', 'grim'];
    return { sum, word, tier };
  })();

  // Custom: any base score from 1 to 20 (racial bonuses come on top, capped at 20).
  // While a score is being typed it may be empty; it falls back to the old value if left blank.
  const [draft, setDraft] = useState<Partial<Record<AbilityKey, string>>>({});
  const setCustom = (key: AbilityKey, value: number) => {
    if (Number.isNaN(value)) return;
    props.onBaseChange({ ...base, [key]: Math.max(1, Math.min(20, value)) });
  };

  return (
    <div>
      <div className="builder-methods" role="tablist" aria-label="How to set ability scores">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={method === m.key}
            className={`builder-method ${method === m.key ? 'is-active' : ''}`}
            onClick={() => method !== m.key && switchMethod(m.key)}
          >
            <span className="builder-method-label">{m.label}</span>
            <span className="builder-method-blurb">{m.blurb}</span>
          </button>
        ))}
      </div>

      {method === 'roll' && (
        <div className={`dice-tray ${rolling ? 'is-rolling' : ''}`}>
          <div className="dice-tray-ring" aria-hidden />
          <div className="dice-tray-top">
            <span className="dice-tray-eyebrow">4d6 · drop the lowest</span>
            <button type="button" className="dice-tray-sound" onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? 'Mute dice' : 'Dice sounds'}>
              {soundOn ? '🔊' : '🔈'}
            </button>
          </div>
          <div className="builder-dice" aria-live="polite">
            {ABILITY_KEYS.map((k, i) => {
              const r = pending?.[i] ?? props.rolls?.[i] ?? null;
              return (
                <D20Die
                  key={k}
                  index={i}
                  rollId={rollId}
                  delay={i * 170}
                  value={r ? r.total : null}
                  assignedTo={!pending ? assignment[i] : undefined}
                  onSettled={onDieSettled}
                />
              );
            })}
          </div>
          {verdict && !rolling && (
            <div className={`dice-verdict is-${verdict.tier}`} aria-live="polite">
              <span className="dice-verdict-word">{verdict.word}</span>
              <span className="dice-verdict-sum">
                Total <strong>{verdict.sum}</strong>
                <em>{verdict.sum >= 72 ? `+${verdict.sum - 72}` : verdict.sum - 72} vs. standard</em>
              </span>
            </div>
          )}
          <button type="button" className="btn btn-theme-primary dice-tray-roll" onClick={roll} disabled={rolling}>
            {rolling ? 'The dice are falling…' : props.rolls ? 'Roll again' : 'Roll the dice'}
          </button>
        </div>
      )}

      {method === 'pointbuy' && (
        <div className="builder-budget" aria-live="polite">
          <div className="builder-budget-bar">
            <span style={{ width: `${(spent / POINT_BUY_BUDGET) * 100}%` }} />
          </div>
          <span><strong>{POINT_BUY_BUDGET - spent}</strong> of {POINT_BUY_BUDGET} points left</span>
        </div>
      )}

      <div className="builder-tip">
        {canSwap && (swapFrom
          ? <>Now tap the ability to swap <strong>{ABILITY_META[swapFrom].name}</strong> with.</>
          : <>Tap two abilities to swap their scores.</>)}
        {method === 'roll' && !props.rolls && <>Roll to see what fate gives you.</>}
        {method === 'custom' && <>Use − and + or tap a score to type it.</>}
        {cls && primary.length > 0 && (
          <span className="builder-tip-class"> {props.classLabel || cls.name} builds rely on {primary.slice(0, 3).map((k) => ABILITY_META[k].name).join(', ').replace(/, ([^,]*)$/, ' and $1')}.</span>
        )}
      </div>

      <div className="builder-abilities">
        {ABILITY_KEYS.map((key) => {
          const final = finalScores[key];
          // Everything added on top of the base score: race bonuses and improvements.
          const bonus = final - base[key];
          const isPrimary = primary.includes(key);
          return (
            <div
              key={key}
              className={`builder-ability ${swapFrom === key ? 'is-swapping' : ''} ${isPrimary ? 'is-primary' : ''} ${canSwap ? 'is-tappable' : ''}`}
              onClick={() => tapToSwap(key)}
              role={canSwap ? 'button' : undefined}
              tabIndex={canSwap ? 0 : undefined}
              onKeyDown={(e) => canSwap && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tapToSwap(key))}
              aria-label={`${ABILITY_META[key].name} ${final}`}
            >
              <div className="builder-ability-name">
                {ABILITY_META[key].short}
                {isPrimary && <span className="builder-ability-star" title={`Key ability for ${cls?.name}`}>★</span>}
              </div>
              {method === 'custom' ? (
                <input
                  type="number"
                  inputMode="numeric"
                  className="builder-ability-input"
                  min={1}
                  max={20}
                  value={draft[key] ?? base[key]}
                  onChange={(e) => {
                    const text = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setDraft((d) => ({ ...d, [key]: text }));
                    if (text) setCustom(key, parseInt(text, 10));
                  }}
                  onFocus={() => setDraft((d) => ({ ...d, [key]: '' }))}
                  onBlur={() => setDraft((d) => {
                    const { [key]: _, ...rest } = d;
                    return rest;
                  })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  aria-label={`${ABILITY_META[key].name} base score`}
                />
              ) : (
                <div className="builder-ability-score">{method === 'roll' && !props.rolls ? '–' : final}</div>
              )}
              <div className="builder-ability-mod">{method === 'roll' && !props.rolls ? '' : signed(modifier(final))}</div>
              <div className="builder-ability-detail">
                {method === 'custom'
                  ? bonus !== 0 ? <>= {final} <span className="builder-ability-bonus">({signed(bonus)})</span></> : <>&nbsp;</>
                  : bonus !== 0 ? <>{base[key]} <span className="builder-ability-bonus">{signed(bonus)}</span></> : <>&nbsp;</>}
              </div>
              {method === 'custom' && (
                <div className="builder-ability-stepper">
                  <button type="button" onClick={() => setCustom(key, base[key] - 1)} disabled={base[key] <= 1} aria-label={`Lower ${ABILITY_META[key].name}`}>−</button>
                  <button type="button" onClick={() => setCustom(key, base[key] + 1)} disabled={base[key] >= 20} aria-label={`Raise ${ABILITY_META[key].name}`}>+</button>
                </div>
              )}
              {method === 'pointbuy' && (
                <div className="builder-ability-stepper" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => adjust(key, -1)} disabled={base[key] <= 8} aria-label={`Lower ${ABILITY_META[key].name}`}>−</button>
                  <button
                    type="button"
                    onClick={() => adjust(key, 1)}
                    disabled={base[key] >= 15 || spent + pointCost(base[key] + 1) - pointCost(base[key]) > POINT_BUY_BUDGET}
                    aria-label={`Raise ${ABILITY_META[key].name}`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(method === 'custom' || (method === 'roll' && props.rolls)) && cls && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mt-3"
          onClick={() => props.onBaseChange(suggestedArray(cls, method === 'roll' && props.rolls ? props.rolls.map((r) => r.total) : STANDARD_ARRAY, primary))}
        >
          ✨ {method === 'custom' ? 'Suggest scores for' : 'Arrange for'} {props.classLabel || cls.name}
        </button>
      )}

      {choice && (
        <div className="builder-bonus-choice mt-3">
          <div className="text-theme mb-2" style={{ fontSize: '0.9rem' }}>{choice.note}</div>
          <div className="d-flex flex-wrap gap-3">
            {choice.amounts.map((amt, slot) => (
              <label key={slot} className="d-flex align-items-center gap-2 text-muted-theme" style={{ fontSize: '0.85rem' }}>
                {signed(amt)}
                <select
                  className="form-select form-select-sm input-theme"
                  value={chosen[slot] || ''}
                  onChange={(e) => setChoice(slot, (e.target.value || null) as AbilityKey | null)}
                >
                  <option value="">Choose…</option>
                  {ABILITY_KEYS.filter((k) => !choice.exclude.includes(k) && !chosen.some((c, i) => i !== slot && c === k)).map((k) => (
                    <option key={k} value={k}>{ABILITY_META[k].name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {props.raceName && Object.keys(fixedBonuses).length > 0 && (
        <p className="text-muted-theme mt-3 mb-0" style={{ fontSize: '0.8rem' }}>
          {props.raceName} bonuses are already included.
        </p>
      )}
    </div>
  );
};

export default AbilityStep;
