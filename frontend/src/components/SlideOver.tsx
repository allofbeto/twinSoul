import React, { useEffect } from 'react';
import '../styles/slideOver.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** A wide panel, for things that need room (a character sheet). */
  wide?: boolean;
}

const SlideOver = ({ isOpen, onClose, title, children, footer, wide }: Props) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <div className={`slide-over-backdrop ${isOpen ? 'is-open' : ''}`} onClick={onClose} aria-hidden={!isOpen}>
      <div
        className={`slide-over-panel ${wide ? 'slide-over-panel--wide' : ''} ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slide-over-header">
          <div className="slide-over-title text-theme">{title}</div>
          <button type="button" className="slide-over-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="slide-over-body">
          {children}
        </div>
        {footer && <div className="slide-over-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default SlideOver;
