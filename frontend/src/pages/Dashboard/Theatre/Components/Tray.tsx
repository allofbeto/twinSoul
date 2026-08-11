import type { AssetKind, RevealAsset } from './types';
import { KIND_LABEL, KIND_ORDER } from './types';

interface TrayProps {
  tab: AssetKind;
  onTabChange: (k: AssetKind) => void;
  items: RevealAsset[];
  kindCounts: Record<AssetKind, number>;
  stageId?: string;
  onReveal: (asset: RevealAsset) => void;
}

export default function Tray({ tab, onTabChange, items, kindCounts, stageId, onReveal }: TrayProps) {
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

      <div className="theatre__tray-grid">
        {items.length === 0 && (
          <p className="theatre__tray-empty">Nothing here yet.</p>
        )}
        {items.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={`theatre__card ${stageId === asset.id ? 'is-live' : ''}`}
            onClick={() => onReveal(asset)}
          >
            {asset.imageUrl ? (
              <span
                className="theatre__card-thumb"
                style={{ backgroundImage: `url(${asset.imageUrl})` }}
              />
            ) : (
              <span className="theatre__card-thumb theatre__card-thumb--text">{KIND_LABEL[asset.kind][0]}</span>
            )}
            <span className="theatre__card-meta">
              <span className="theatre__card-title">{asset.title}</span>
              {asset.subtitle && <span className="theatre__card-sub">{asset.subtitle}</span>}
            </span>
            {stageId === asset.id && <span className="theatre__live-badge">On stage</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}