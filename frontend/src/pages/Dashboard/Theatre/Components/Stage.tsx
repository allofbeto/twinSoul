import { useState } from 'react';
import type { DragEvent } from 'react';
import type { RevealAsset } from './types';

interface StageProps {
  stage: RevealAsset | null;
  onClear: () => void;
  onDropAsset?: (asset: RevealAsset) => void;
  readOnly?: boolean;
}

export default function Stage({ stage, onClear, onDropAsset, readOnly = false }: StageProps) {
  const [dragOver, setDragOver] = useState(false);
  const canDrop = !readOnly && !!onDropAsset;

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    if (!canDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    if (!canDrop) return;
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      onDropAsset!(JSON.parse(raw) as RevealAsset);
    } catch {
      // Ignore drops that aren't a tray card.
    }
  };

  return (
    <main
      className={`theatre__stage ${dragOver ? 'is-dragover' : ''}`}
      aria-label="Stage"
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {stage ? (
        <div className="theatre__scene" key={stage.id}>
          <div className="theatre__scene-head">
            <div>
              <h2 className="theatre__scene-title">{stage.title}</h2>
              {stage.subtitle && <p className="theatre__scene-sub">{stage.subtitle}</p>}
            </div>
            {!readOnly && (
              <button type="button" className="theatre__icon-btn" onClick={onClear}>
                Clear stage
              </button>
            )}
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
          <p className="theatre__empty-hint">
            {readOnly
              ? 'Waiting for the DM to reveal something.'
              : 'Pick something from the tray to reveal it.'}
          </p>
        </div>
      )}
    </main>
  );
}