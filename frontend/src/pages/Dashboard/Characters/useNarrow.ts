import { createContext, useEffect, useState } from 'react';

/** True when the sheet is showing its phone layout. */
export const NarrowContext = createContext(false);

/**
 * True while the element is narrower than `width`. Measures the sheet itself
 * (not the window) so a sheet embedded in a narrow panel gets the phone layout
 * too. Use the returned callback as the element's ref.
 */
export const useNarrow = (width = 640): [(el: HTMLElement | null) => void, boolean] => {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (!el) return undefined;
    const measure = () => setNarrow(el.getBoundingClientRect().width < width);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, width]);

  return [setEl, narrow];
};

/**
 * Drag a bottom sheet's header down to close it. Modals render outside the
 * sheet, so this listens on the document and clicks the sheet's own close button.
 */
export const useSheetSwipeDismiss = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return undefined;
    let dialog: HTMLElement | null = null;
    let startY = 0;
    let dy = 0;

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const header = target.closest('.theme-modal .modal-header');
      if (!header || target.closest('button')) return;
      dialog = header.closest('.modal-dialog');
      startY = e.touches[0].clientY;
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!dialog) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      dialog.style.transition = 'none';
      dialog.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!dialog) return;
      const el = dialog;
      dialog = null;
      el.style.transition = '';
      el.style.transform = '';
      if (dy > 110) el.querySelector<HTMLElement>('.btn-close')?.click();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);
};
