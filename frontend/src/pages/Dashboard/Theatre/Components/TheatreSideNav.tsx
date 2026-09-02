import type { AssetKind, DmPanel } from './types';
import { KIND_LABEL, KIND_ORDER } from './types';

const KIND_ICON: Record<AssetKind, string> = {
  art: 'bx-image',
  map: 'bx-map-alt',
  npc: 'bx-group',
  encounter: 'bx-shield-quarter',
  item: 'bx-package',
};

interface TheatreSideNavProps {
  onExit?: () => void;
  notesOpen: boolean;
  onToggleNotes: () => void;
  trayOpen: boolean;
  onToggleTray: () => void;
  tab: AssetKind;
  onTabChange: (k: AssetKind) => void;
  kindCounts: Record<AssetKind, number>;
  panel: DmPanel;
  combatantCount: number;
  onTogglePanel: (p: DmPanel) => void;
}

export default function TheatreSideNav({
  onExit,
  notesOpen,
  onToggleNotes,
  trayOpen,
  onToggleTray,
  tab,
  onTabChange,
  kindCounts,
  panel,
  combatantCount,
  onTogglePanel,
}: TheatreSideNavProps) {
  return (
    <nav className="theatre__sidenav" aria-label="Theatre tools">
      {onExit && (
        <button
          type="button"
          className="theatre__sidenav-btn"
          onClick={onExit}
          data-tooltip="Exit theatre"
          aria-label="Exit theatre"
        >
          <i className="bx bx-chevron-left" aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        className={`theatre__sidenav-btn ${notesOpen ? 'is-on' : ''}`}
        onClick={onToggleNotes}
        aria-pressed={notesOpen}
        data-tooltip="Notes"
      >
        <i className="bx bx-note" aria-hidden="true" />
      </button>

      <div className="theatre__sidenav-spacer" />

      <button
        type="button"
        className={`theatre__sidenav-btn ${panel === 'dice' ? 'is-on' : ''}`}
        onClick={() => onTogglePanel('dice')}
        aria-pressed={panel === 'dice'}
        data-tooltip="Dice"
      >
        <i className="bx bx-dice-6" aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`theatre__sidenav-btn ${panel === 'initiative' ? 'is-on' : ''}`}
        onClick={() => onTogglePanel('initiative')}
        aria-pressed={panel === 'initiative'}
        data-tooltip={`Initiative${combatantCount > 0 ? ` · ${combatantCount}` : ''}`}
      >
        <i className="bx bx-list-ol" aria-hidden="true" />
        {combatantCount > 0 && <span className="theatre__sidenav-badge">{combatantCount}</span>}
      </button>

      <button
        type="button"
        className={`theatre__sidenav-btn ${panel === 'scratch' ? 'is-on' : ''}`}
        onClick={() => onTogglePanel('scratch')}
        aria-pressed={panel === 'scratch'}
        data-tooltip="Scratch"
      >
        <i className="bx bx-pencil" aria-hidden="true" />
      </button>

      <div className="theatre__sidenav-spacer" />

      {KIND_ORDER.map((k) => (
        <button
          key={k}
          type="button"
          className={`theatre__sidenav-btn ${trayOpen && tab === k ? 'is-on' : ''}`}
          onClick={() => onTabChange(k)}
          aria-pressed={trayOpen && tab === k}
          data-tooltip={`${KIND_LABEL[k]} · ${kindCounts[k]}`}
        >
          <i className={`bx ${KIND_ICON[k]}`} aria-hidden="true" />
          {kindCounts[k] > 0 && <span className="theatre__sidenav-badge">{kindCounts[k]}</span>}
        </button>
      ))}

      <div className="theatre__sidenav-spacer" />

      <button
        type="button"
        className={`theatre__sidenav-btn ${trayOpen ? 'is-on' : ''}`}
        onClick={onToggleTray}
        aria-pressed={trayOpen}
        data-tooltip="Tray"
      >
        <i className="bx bx-layer" aria-hidden="true" />
      </button>
    </nav>
  );
}
