import type { DmPanel } from './types';

interface DmBarProps {
  panel: DmPanel;
  combatantCount: number;
  onToggle: (p: DmPanel) => void;
}

export default function DmBar({ panel, combatantCount, onToggle }: DmBarProps) {
  return (
    <footer className="theatre__bar">
      <button type="button" className={`theatre__tool ${panel === 'dice' ? 'is-open' : ''}`} onClick={() => onToggle('dice')}>
        ⬦ Dice
      </button>
      <button type="button" className={`theatre__tool ${panel === 'initiative' ? 'is-open' : ''}`} onClick={() => onToggle('initiative')}>
        ⚔ Initiative{combatantCount > 0 ? ` · ${combatantCount}` : ''}
      </button>
      <button type="button" className={`theatre__tool ${panel === 'scratch' ? 'is-open' : ''}`} onClick={() => onToggle('scratch')}>
        ✎ Scratch
      </button>
    </footer>
  );
}