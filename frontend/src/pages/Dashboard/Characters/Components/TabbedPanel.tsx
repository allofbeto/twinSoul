import React, { useState } from 'react';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import '../../../../styles/homebrew.css'; // theme-modal

export interface SheetTab {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface Props {
  tabs: SheetTab[];
  /** Phone layout: the tabs become a bottom navigation bar. */
  bottom?: boolean;
}

// Stroke icons for the bottom bar (24x24 viewBox).
const ICONS: Record<string, string> = {
  actions: 'M13 2L4 14h7l-1 8 9-12h-7z',
  spells: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16v4 M17 18h4',
  resources: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 8v4l3 2',
  stats: 'M5 20V11 M12 20V4 M19 20v-6',
  feats: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  features: 'M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h4',
  inventory: 'M6 8h12l1 12H5z M9 8a3 3 0 0 1 6 0',
  notes: 'M4 20l1-4L16 5l3 3L8 19z',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
};

const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name] || ICONS.notes} />
  </svg>
);

const MAX_BAR = 5;

// The deeper parts of the sheet, one at a time.
const TabbedPanel = ({ tabs, bottom }: Props) => {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const [moreOpen, setMoreOpen] = useState(false);
  const active = tabs.find((t) => t.key === activeKey) || tabs[0];

  if (bottom) {
    // Four tabs and "More" when there are too many to fit the bar.
    const crowded = tabs.length > MAX_BAR;
    const inBar = crowded ? tabs.slice(0, MAX_BAR - 1) : tabs;
    const more = crowded ? tabs.slice(MAX_BAR - 1) : [];
    const moreActive = more.some((t) => t.key === active?.key);

    return (
      <section className="sheet-tabs sheet-tabs--mobile">
        <div className="sheet-tabs-body" role="tabpanel" aria-label={active?.label}>{active?.content}</div>
        <nav className="sheet-bottomnav" role="tablist" aria-label="Sheet sections">
          {inBar.map((tab) => (
            <button
              type="button"
              role="tab"
              key={tab.key}
              aria-selected={active?.key === tab.key}
              className={`sheet-bottomnav-item ${active?.key === tab.key ? 'active' : ''}`}
              onClick={() => setActiveKey(tab.key)}
            >
              <Icon name={tab.key} />
              <span>{tab.label}</span>
            </button>
          ))}
          {crowded && (
            <button
              type="button"
              className={`sheet-bottomnav-item ${moreActive ? 'active' : ''}`}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
            >
              <Icon name="more" />
              <span>{moreActive ? active.label.replace(/\s*\(\d+\)$/, '') : 'More'}</span>
            </button>
          )}
        </nav>

        <Modal isOpen={moreOpen} toggle={() => setMoreOpen(false)} centered fullscreen="sm" contentClassName="theme-modal">
          <ModalHeader toggle={() => setMoreOpen(false)}>More</ModalHeader>
          <ModalBody>
            <div className="sheet-more-list">
              {more.map((tab) => (
                <button
                  type="button"
                  key={tab.key}
                  className={`sheet-more-item ${active?.key === tab.key ? 'active' : ''}`}
                  onClick={() => { setActiveKey(tab.key); setMoreOpen(false); }}
                >
                  <Icon name={tab.key} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </ModalBody>
        </Modal>
      </section>
    );
  }

  return (
    <section className="sheet-card sheet-card--flush sheet-tabs">
      <div className="tabbed-panel-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            key={tab.key}
            aria-selected={active?.key === tab.key}
            className={`tabbed-panel-tab ${active?.key === tab.key ? 'active' : ''}`}
            onClick={() => setActiveKey(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="sheet-tabs-body" role="tabpanel">{active?.content}</div>
    </section>
  );
};

export default TabbedPanel;
