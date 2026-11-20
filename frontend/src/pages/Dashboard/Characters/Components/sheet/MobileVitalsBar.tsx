import React, { useState } from 'react';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import '../../../../../styles/homebrew.css'; // theme-modal

interface Props {
  currentHp: number;
  maxHp: number;
  tempHp: number;
  armorClass: number;
  initiative: number;
  name: string;
  avatarUrl?: string;
  isOwner: boolean;
  onDamage: (amount: number) => void;
  onHeal: (amount: number) => void;
  /** The full vitals card, shown in a bottom sheet when the bar is tapped. */
  children: React.ReactNode;
}

// Phone header that stays in view: HP, AC and one-tap -1 / +1. Tap it for the
// full vitals (damage, healing, rests, death saves, hit dice).
const MobileVitalsBar = ({ currentHp, maxHp, tempHp, armorClass, initiative, name, avatarUrl, isOwner, onDamage, onHeal, children }: Props) => {
  const [open, setOpen] = useState(false);
  const percent = maxHp > 0 ? Math.min(100, (currentHp / maxHp) * 100) : 0;
  const tone = percent <= 25 ? 'is-low' : percent <= 50 ? 'is-mid' : '';

  return (
    <>
      <div className="sheet-vbar">
        <button type="button" className="sheet-vbar-avatar" onClick={() => setOpen(true)} aria-label={`${name}: open vitals`}>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
        </button>
        <button type="button" className="sheet-vbar-main" onClick={() => setOpen(true)} aria-label="Open vitals">
          <span className="sheet-vbar-hp">
            <b>{currentHp}</b>
            <span>/ {maxHp} HP</span>
            {tempHp > 0 && <i>+{tempHp}</i>}
          </span>
          <span className="sheet-vbar-track" aria-hidden="true">
            <span className={`sheet-vbar-fill ${tone}`} style={{ width: `${percent}%` }} />
          </span>
        </button>
        {isOwner && (
          <div className="sheet-vbar-quick">
            <button type="button" onClick={() => onDamage(1)} aria-label="Take 1 damage">−</button>
            <button type="button" onClick={() => onHeal(1)} aria-label="Heal 1">+</button>
          </div>
        )}
        <button type="button" className="sheet-vbar-stat" onClick={() => setOpen(true)} aria-label={`Armor class ${armorClass}`}>
          <span>AC</span><b>{armorClass}</b>
        </button>
        <button type="button" className="sheet-vbar-stat" onClick={() => setOpen(true)} aria-label={`Initiative ${initiative}`}>
          <span>Init</span><b>{initiative >= 0 ? `+${initiative}` : initiative}</b>
        </button>
      </div>

      <Modal isOpen={open} toggle={() => setOpen(false)} centered scrollable fullscreen="sm" contentClassName="theme-modal">
        <ModalHeader toggle={() => setOpen(false)}>Vitals</ModalHeader>
        <ModalBody><div className="sheet">{children}</div></ModalBody>
      </Modal>
    </>
  );
};

export default MobileVitalsBar;
