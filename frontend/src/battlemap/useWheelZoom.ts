import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** Where the map itself is drawn on screen: the SVG box minus any letterboxing from "fit". */
function drawnBox(svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  if (!vb || !vb.width || !vb.height) return rect;
  const s = Math.min(rect.width / vb.width, rect.height / vb.height);
  const width = vb.width * s, height = vb.height * s;
  return { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width, height };
}

interface Options {
  /** Width of the map drawing at zoom 1, in px (to read the current scale off the screen). */
  naturalWidth: number;
  min: number;
  max: number;
  /** Called with the new scale; the caller decides how to store it (e.g. snap back to "fit"). */
  onZoom: (scale: number) => void;
  enabled?: boolean;
}

/**
 * ⌘/Ctrl + scroll (and trackpad pinch, which browsers report the same way)
 * zooms the map inside `ref`, keeping the point under the cursor in place.
 * Plain scrolling is left alone so it still pans.
 */
export function useWheelZoom(ref: RefObject<HTMLElement | null>, { naturalWidth, min, max, onZoom, enabled = true }: Options) {
  const anchor = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null);
  const opts = useRef({ naturalWidth, min, max, onZoom });
  opts.current = { naturalWidth, min, max, onZoom };

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const svg = el.querySelector('svg');
      if (!svg) return;
      e.preventDefault(); // otherwise the browser zooms the whole page
      const rect = drawnBox(svg);
      const { naturalWidth: nw, min: lo, max: hi } = opts.current;
      const scale = rect.width / nw;
      // Pinch gestures send small deltas, mouse wheels big ones; both feel even this way.
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const next = Math.min(hi, Math.max(lo, scale * Math.exp(-delta * 0.0022)));
      if (Math.abs(next - scale) < 0.001) return;
      // Remember which bit of the map is under the cursor, as a fraction of the drawing.
      anchor.current = { fx: (e.clientX - rect.left) / rect.width, fy: (e.clientY - rect.top) / rect.height, cx: e.clientX, cy: e.clientY };
      opts.current.onZoom(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, enabled]);

  // After the zoomed map has rendered, scroll so that point is back under the cursor.
  useLayoutEffect(() => {
    const el = ref.current;
    const a = anchor.current;
    if (!el || !a) return;
    anchor.current = null;
    const svg = el.querySelector('svg');
    if (!svg) return;
    const rect = drawnBox(svg);
    el.scrollLeft += rect.left + a.fx * rect.width - a.cx;
    el.scrollTop += rect.top + a.fy * rect.height - a.cy;
  });
}
