import { useEffect } from 'react';
import type { RevealAsset } from './types';
import { renderNotes } from './sanitizeNotes';

interface AssetDetailModalProps {
  asset: RevealAsset;
  isLive?: boolean;
  onClose: () => void;
  /** Omit when the modal is just a read-only "read more" (e.g. from a card already on stage). */
  onReveal?: (asset: RevealAsset) => void;
}

export default function AssetDetailModal({ asset, isLive, onClose, onReveal }: AssetDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="theatre__modal-backdrop" onClick={onClose}>
      <div
        className="theatre__modal"
        role="dialog"
        aria-modal="true"
        aria-label={asset.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="theatre__modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {asset.imageUrl && (
          <div className="theatre__modal-media">
            <img src={asset.imageUrl} alt={asset.title} />
          </div>
        )}

        <h2 className="theatre__modal-title">{asset.title}</h2>
        {asset.subtitle && <p className="theatre__modal-sub">{asset.subtitle}</p>}
        {asset.body && (
          <div
            className="theatre__modal-body theatre__notes-html"
            dangerouslySetInnerHTML={{ __html: renderNotes(asset.body) }}
          />
        )}

        {asset.tags && asset.tags.length > 0 && (
          <div className="theatre__tags">
            {asset.tags.map((tg) => <span key={tg} className="theatre__tag">{tg}</span>)}
          </div>
        )}

        <div className="theatre__modal-actions">
          {onReveal && (
            <button type="button" className="theatre__btn" onClick={() => { onReveal(asset); onClose(); }}>
              {isLive ? 'On stage' : 'Reveal to table'}
            </button>
          )}
          <button type="button" className="theatre__btn theatre__btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
