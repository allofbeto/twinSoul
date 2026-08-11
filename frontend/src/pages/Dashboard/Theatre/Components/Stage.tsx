import type { RevealAsset } from './types';

interface StageProps {
  stage: RevealAsset | null;
  onClear: () => void;
}

export default function Stage({ stage, onClear }: StageProps) {
  return (
    <main className="theatre__stage" aria-label="Stage">
      {stage ? (
        <div className="theatre__scene" key={stage.id}>
          <div className="theatre__scene-head">
            <div>
              <h2 className="theatre__scene-title">{stage.title}</h2>
              {stage.subtitle && <p className="theatre__scene-sub">{stage.subtitle}</p>}
            </div>
            <button type="button" className="theatre__icon-btn" onClick={onClear}>
              Clear stage
            </button>
          </div>

          {stage.imageUrl && (
            <div className="theatre__scene-media">
              <img src={stage.imageUrl} alt={stage.title} />
            </div>
          )}

          {stage.body && <pre className="theatre__scene-body">{stage.body}</pre>}

          {stage.tags && stage.tags.length > 0 && (
            <div className="theatre__tags">
              {stage.tags.map((tg) => <span key={tg} className="theatre__tag">{tg}</span>)}
            </div>
          )}
        </div>
      ) : (
        <div className="theatre__empty">
          <p className="theatre__empty-mark">✦</p>
          <p className="theatre__empty-text">The stage is dark.</p>
          <p className="theatre__empty-hint">Pick something from the tray to reveal it.</p>
        </div>
      )}
    </main>
  );
}