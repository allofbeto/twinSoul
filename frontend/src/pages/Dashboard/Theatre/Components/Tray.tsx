import { useState } from 'react';
import type { AssetKind, NewItemInput, RevealAsset } from './types';
import { KIND_LABEL, KIND_ORDER } from './types';
import ItemCreateForm from './ItemCreateForm';
import AssetDetailModal from './AssetDetailModal';

interface TrayProps {
  tab: AssetKind;
  onTabChange: (k: AssetKind) => void;
  items: RevealAsset[];
  kindCounts: Record<AssetKind, number>;
  stageId?: string;
  onReveal: (asset: RevealAsset) => void;
  onCreateItem?: (data: NewItemInput) => Promise<RevealAsset>;
}

const TAGS_SHOWN = 3;

export default function Tray({ tab, onTabChange, items, kindCounts, stageId, onReveal, onCreateItem }: TrayProps) {
  const [detailAsset, setDetailAsset] = useState<RevealAsset | null>(null);
  return (
    <aside className="theatre__tray" aria-label="Reveal tray">
      <div className="theatre__tabs" role="tablist">
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={`theatre__tab ${tab === k ? 'is-active' : ''}`}
            onClick={() => onTabChange(k)}
          >
            {KIND_LABEL[k]}
            <span className="theatre__tab-count">{kindCounts[k]}</span>
          </button>
        ))}
      </div>

      {tab === 'item' && onCreateItem && (
        <div className="theatre__tray-create">
          <ItemCreateForm onCreate={onCreateItem} />
        </div>
      )}

      <div className="theatre__tray-grid">
        {items.length === 0 && (
          <p className="theatre__tray-empty">Nothing here yet.</p>
        )}
        {items.map((asset) => {
          const isLive = stageId === asset.id;
          const shownTags = asset.tags?.slice(0, TAGS_SHOWN);
          const hiddenTagCount = (asset.tags?.length ?? 0) - (shownTags?.length ?? 0);
          return (
            <article
              key={asset.id}
              draggable
              className={`theatre__card ${isLive ? 'is-live' : ''}`}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(asset));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <div
                className="theatre__card-media"
                style={asset.imageUrl ? { backgroundImage: `url(${asset.imageUrl})` } : undefined}
              >
                {!asset.imageUrl && (
                  <span className="theatre__card-media-letter">{KIND_LABEL[asset.kind][0]}</span>
                )}
                {isLive && <span className="theatre__live-badge">On stage</span>}
              </div>

              <div className="theatre__card-body">
                <h3 className="theatre__card-title">{asset.title}</h3>
                {asset.subtitle && <p className="theatre__card-sub">{asset.subtitle}</p>}
                {asset.body && <p className="theatre__card-preview">{asset.body}</p>}
                {shownTags && shownTags.length > 0 && (
                  <div className="theatre__card-tags">
                    {shownTags.map((tg) => <span key={tg} className="theatre__tag">{tg}</span>)}
                    {hiddenTagCount > 0 && <span className="theatre__tag">+{hiddenTagCount}</span>}
                  </div>
                )}
              </div>

              <div className="theatre__card-footer">
                <button type="button" className="theatre__btn theatre__btn--sm" onClick={() => onReveal(asset)}>
                  {isLive ? 'On stage' : 'Reveal'}
                </button>
                <button type="button" className="theatre__card-link" onClick={() => setDetailAsset(asset)}>
                  Read more
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {detailAsset && (
        <AssetDetailModal
          asset={detailAsset}
          isLive={stageId === detailAsset.id}
          onClose={() => setDetailAsset(null)}
          onReveal={onReveal}
        />
      )}
    </aside>
  );
}