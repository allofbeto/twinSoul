import React, { useEffect, useState } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import '../../../../../styles/homebrew.css'; // theme-modal
import { HitDiePool, signed, SlotLevel, TrackedResource } from '../../sheetRules';

export type RestKind = 'short' | 'long';

interface Props {
  kind: RestKind | null;
  onClose: () => void;
  hitDice: HitDiePool[];
  conMod: number;
  currentHp: number;
  maxHp: number;
  slots: SlotLevel[];
  resources: TrackedResource[];
  /** Spends one hit die and heals by the total (already applied to the sheet). */
  onSpendHitDie: (die: string, healed: number) => void;
  onFinish: (kind: RestKind) => void;
}

interface Roll { die: string; roll: number; healed: number }

const RestDialog = ({ kind, onClose, hitDice, conMod, currentHp, maxHp, slots, resources, onSpendHitDie, onFinish }: Props) => {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [manual, setManual] = useState<Record<string, string>>({});

  useEffect(() => {
    if (kind) { setRolls([]); setManual({}); }
  }, [kind]);

  const spend = (pool: HitDiePool, rolled?: number) => {
    const roll = rolled ?? Math.floor(Math.random() * pool.size) + 1;
    const healed = Math.max(0, roll + conMod);
    onSpendHitDie(pool.die, healed);
    setRolls((r) => [...r, { die: pool.die, roll, healed }]);
    setManual((m) => ({ ...m, [pool.die]: '' }));
  };

  const shortBack = [
    ...slots.filter((s) => s.key === 'pact' && s.used > 0).map((s) => `${s.label} slots`),
    ...resources.filter((r) => r.recharge === 'short' && r.used > 0).map((r) => r.label),
  ];
  const longBack = [
    currentHp < maxHp && 'Hit points to full',
    slots.some((s) => s.used > 0) && 'All spell slots',
    resources.some((r) => r.used > 0) && 'All class resources',
    hitDice.some((p) => p.used > 0) && 'Half your hit dice',
  ].filter(Boolean) as string[];

  return (
    <Modal isOpen={!!kind} toggle={onClose} centered contentClassName="theme-modal">
      <ModalHeader toggle={onClose}>{kind === 'short' ? 'Short Rest' : 'Long Rest'}</ModalHeader>
      <ModalBody>
        {kind === 'short' && (
          <>
            <p className="text-muted-theme mb-3" style={{ fontSize: '0.85rem' }}>
              Spend hit dice to heal: each one heals its roll {signed(conMod)} (CON). HP {currentHp} / {maxHp}.
            </p>
            {hitDice.length === 0 && <p className="text-muted-theme">Add a class to get hit dice.</p>}
            <div className="d-flex flex-column gap-2">
              {hitDice.map((p) => {
                const left = p.total - p.used;
                const typed = parseInt(manual[p.die] || '', 10);
                const typedOk = typed >= 1 && typed <= p.size;
                return (
                  <div key={p.die} className="sheet-rest-pool">
                    <span className="sheet-rest-pool-name"><strong>{p.die}</strong> · {left} left</span>
                    <button type="button" className="sheet-btn sheet-btn--primary" disabled={left <= 0 || currentHp >= maxHp} onClick={() => spend(p)}>
                      Roll {p.die}
                    </button>
                    <input
                      type="number"
                      className="sheet-rest-manual"
                      placeholder="or type roll"
                      min={1}
                      max={p.size}
                      value={manual[p.die] || ''}
                      onChange={(e) => setManual((m) => ({ ...m, [p.die]: e.target.value }))}
                      disabled={left <= 0}
                    />
                    <button type="button" className="sheet-btn" disabled={left <= 0 || !typedOk || currentHp >= maxHp} onClick={() => spend(p, typed)}>
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
            {rolls.length > 0 && (
              <ul className="sheet-rest-log">
                {rolls.map((r, i) => (
                  <li key={i}>{r.die}: rolled {r.roll} {signed(conMod)} → healed {r.healed}</li>
                ))}
              </ul>
            )}
            <p className="text-muted-theme mt-3 mb-0" style={{ fontSize: '0.8rem' }}>
              Finishing the rest also restores: {shortBack.length ? shortBack.join(', ') : 'nothing else right now'}.
            </p>
          </>
        )}
        {kind === 'long' && (
          <>
            <p className="mb-2">After eight hours of rest you regain:</p>
            {longBack.length ? (
              <ul className="mb-0">{longBack.map((t) => <li key={t}>{t}</li>)}</ul>
            ) : (
              <p className="text-muted-theme mb-0">You're already fully rested.</p>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{rolls.length ? 'Close' : 'Cancel'}</button>
        <button type="button" className="btn btn-theme-primary" onClick={() => kind && onFinish(kind)}>
          {kind === 'short' ? 'Finish Short Rest' : 'Take Long Rest'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default RestDialog;
