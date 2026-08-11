import type { RollResult } from './types';

interface DicePanelProps {
  diceInput: string;
  diceError: boolean;
  rolls: RollResult[];
  onInputChange: (value: string) => void;
  onRoll: () => void;
  onQuickRoll: (expr: string) => void;
}

const QUICK_DICE = ['d20', 'd12', 'd8', 'd6', 'd4', '2d6'];

export default function DicePanel({
  diceInput,
  diceError,
  rolls,
  onInputChange,
  onRoll,
  onQuickRoll,
}: DicePanelProps) {
  return (
    <div className="theatre__dice">
      <div className="theatre__dice-controls">
        <input
          className={`theatre__input ${diceError ? 'is-error' : ''}`}
          value={diceInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRoll()}
          placeholder="1d20+5"
          aria-label="Dice expression"
        />
        <button type="button" className="theatre__btn" onClick={onRoll}>Roll</button>
        <div className="theatre__quick">
          {QUICK_DICE.map((d) => (
            <button key={d} type="button" className="theatre__chip" onClick={() => onQuickRoll(d)}>{d}</button>
          ))}
        </div>
      </div>
      <ul className="theatre__roll-log">
        {rolls.length === 0 && <li className="theatre__roll-empty">No rolls yet.</li>}
        {rolls.map((r, i) => (
          <li key={`${r.expr}-${i}`} className={`theatre__roll ${i === 0 ? 'is-latest' : ''}`}>
            <span className="theatre__roll-total">{r.total}</span>
            <span className="theatre__roll-detail">{r.expr} → {r.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}