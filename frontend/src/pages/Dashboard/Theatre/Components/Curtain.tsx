interface CurtainProps {
    sessionTitle: string;
    campaignName?: string;
    notesOpen: boolean;
    trayOpen: boolean;
    onToggleNotes: () => void;
    onToggleTray: () => void;
    onExit?: () => void;
  }
  
  export default function Curtain({
    sessionTitle,
    campaignName,
    notesOpen,
    trayOpen,
    onToggleNotes,
    onToggleTray,
    onExit,
  }: CurtainProps) {
    return (
      <header className="theatre__curtain">
        <div className="theatre__curtain-left">
          {onExit && (
            <button type="button" className="theatre__icon-btn" onClick={onExit} aria-label="Exit theatre">
              ‹ Exit
            </button>
          )}
          <button
            type="button"
            className={`theatre__icon-btn ${notesOpen ? 'is-on' : ''}`}
            onClick={onToggleNotes}
            aria-pressed={notesOpen}
          >
            Notes
          </button>
        </div>
  
        <div className="theatre__title">
          <span className="theatre__title-main">{sessionTitle}</span>
          {campaignName && <span className="theatre__title-sub">{campaignName}</span>}
        </div>
  
        <div className="theatre__curtain-right">
          <button
            type="button"
            className={`theatre__icon-btn ${trayOpen ? 'is-on' : ''}`}
            onClick={onToggleTray}
            aria-pressed={trayOpen}
          >
            Tray
          </button>
        </div>
      </header>
    );
  }