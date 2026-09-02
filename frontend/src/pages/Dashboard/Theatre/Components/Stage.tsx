import { useCallback, useRef, useState } from 'react';
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { RevealAsset, StagedAsset } from './types';
import { clamp } from './types';
import { notesPreviewText } from './sanitizeNotes';
import AssetDetailModal from './AssetDetailModal';

interface StageProps {
  stage: StagedAsset[];
  onClear: () => void;
  onDropAsset?: (asset: RevealAsset) => void;
  onRemoveAsset?: (instanceId: string) => void;
  onMoveAsset?: (instanceId: string, x: number, y: number) => void;
  readOnly?: boolean;
}

interface DragState {
  instanceId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  maxX: number;
  maxY: number;
  x: number;
  y: number;
}

export default function Stage({ stage, onClear, onDropAsset, onRemoveAsset, onMoveAsset, readOnly = false }: StageProps) {
  const [dragOver, setDragOver] = useState(false);
  const [frontId, setFrontId] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<StagedAsset | null>(null);
  // Positions a viewer dragged themselves when no onMoveAsset is wired up (e.g. a
  // player): purely local, never sent anywhere, so it can't affect the DM or anyone else.
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const stageElRef = useRef<HTMLElement | null>(null);
  const cardElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardDrag = useRef<DragState | null>(null);
  const onMoveAssetRef = useRef(onMoveAsset);
  onMoveAssetRef.current = onMoveAsset;

  const canDrop = !readOnly && !!onDropAsset;

  const getPos = useCallback(
    (asset: StagedAsset) => localPositions[asset.instanceId] ?? { x: asset.x, y: asset.y },
    [localPositions],
  );

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

  const handleCardPointerMove = useCallback((e: PointerEvent) => {
    const state = cardDrag.current;
    const stageEl = stageElRef.current;
    if (!state || !stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const dxPct = ((e.clientX - state.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - state.startClientY) / rect.height) * 100;
    const x = clamp(state.startX + dxPct, 0, state.maxX);
    const y = clamp(state.startY + dyPct, 0, state.maxY);
    state.x = x;
    state.y = y;
    const cardEl = cardElRefs.current[state.instanceId];
    if (cardEl) {
      cardEl.style.left = `${x}%`;
      cardEl.style.top = `${y}%`;
    }
  }, []);

  const endCardDrag = useCallback(() => {
    const state = cardDrag.current;
    window.removeEventListener('pointermove', handleCardPointerMove);
    window.removeEventListener('pointerup', endCardDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (state) {
      if (onMoveAssetRef.current) {
        // Shared position: broadcasts to the table (DM driving the stage).
        onMoveAssetRef.current(state.instanceId, state.x, state.y);
      } else {
        // No shared move handler wired up — keep this arrangement local to this viewer only.
        setLocalPositions((prev) => ({ ...prev, [state.instanceId]: { x: state.x, y: state.y } }));
      }
    }
    cardDrag.current = null;
  }, [handleCardPointerMove]);

  const startCardDrag = useCallback((asset: StagedAsset) => (e: ReactPointerEvent) => {
    e.preventDefault();
    const stageEl = stageElRef.current;
    const cardEl = cardElRefs.current[asset.instanceId];
    if (!stageEl || !cardEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const maxX = Math.max(0, 100 - (cardRect.width / stageRect.width) * 100);
    const maxY = Math.max(0, 100 - (cardRect.height / stageRect.height) * 100);
    const pos = getPos(asset);
    cardDrag.current = {
      instanceId: asset.instanceId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: pos.x,
      startY: pos.y,
      maxX,
      maxY,
      x: pos.x,
      y: pos.y,
    };
    setFrontId(asset.instanceId);
    window.addEventListener('pointermove', handleCardPointerMove);
    window.addEventListener('pointerup', endCardDrag);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [getPos, handleCardPointerMove, endCardDrag]);

  return (
    <main
      className={`theatre__stage ${dragOver ? 'is-dragover' : ''}`}
      aria-label="Stage"
      ref={stageElRef}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {stage.length > 0 ? (
        <>
          {!readOnly && (
            <div className="theatre__stage-toolbar">
              <button type="button" className="theatre__icon-btn" onClick={onClear}>
                Clear stage
              </button>
            </div>
          )}

          <div className="theatre__stage-surface">
            {stage.map((asset) => {
              const pos = getPos(asset);
              return (
              <div
                className="theatre__scene is-movable"
                key={asset.instanceId}
                ref={(el) => { cardElRefs.current[asset.instanceId] = el; }}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: frontId === asset.instanceId ? 10 : 1 }}
              >
                {!readOnly && onRemoveAsset && (
                  <button
                    type="button"
                    className="theatre__scene-remove"
                    aria-label={`Remove ${asset.title} from stage`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onRemoveAsset(asset.instanceId)}
                  >
                    ×
                  </button>
                )}

                <div
                  className="theatre__scene-head"
                  onPointerDown={startCardDrag(asset)}
                >
                  <h2 className="theatre__scene-title">{asset.title}</h2>
                  {asset.subtitle && <p className="theatre__scene-sub">{asset.subtitle}</p>}
                </div>

                {asset.imageUrl && (
                  <div className="theatre__scene-media">
                    <img src={asset.imageUrl} alt={asset.title} draggable={false} />
                  </div>
                )}

                {asset.body && (
                  <div className="theatre__scene-body-wrap">
                    <p className="theatre__scene-preview">{notesPreviewText(asset.body)}</p>
                    <button
                      type="button"
                      className="theatre__card-link"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setDetailAsset(asset)}
                    >
                      Read more
                    </button>
                  </div>
                )}

                {asset.tags && asset.tags.length > 0 && (
                  <div className="theatre__tags">
                    {asset.tags.map((tg) => <span key={tg} className="theatre__tag">{tg}</span>)}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </>
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

      {detailAsset && (
        <AssetDetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
      )}
    </main>
  );
}
