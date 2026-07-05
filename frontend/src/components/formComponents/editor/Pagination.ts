import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface PaginationOptions {
  /** Total height of one page sheet in px, including top/bottom margins */
  pageHeight: number;
  /** Height of the visible "desk" gap between sheets in px */
  gap: number;
}

const paginationKey = new PluginKey('pagination');

/**
 * Visual pagination via ProseMirror decorations.
 *
 * When a top-level block would overflow the current page, a widget
 * decoration is inserted before it: filler to the bottom of the sheet,
 * a desk-colored gap band, then the next sheet's top margin.
 *
 * Decorations are not part of the document, so editor.getHTML()
 * (and therefore the saved session notes) are completely unaffected.
 *
 * Page margins are read from the .ProseMirror element's computed
 * padding at recalc time, so responsive padding changes stay in sync
 * automatically.
 */
export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageHeight: 1100,
      gap: 48,
    };
  },

  addProseMirrorPlugins() {
    const { pageHeight, gap } = this.options;

    return [
      new Plugin({
        key: paginationKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(paginationKey);
            if (meta) return meta as DecorationSet;
            return tr.docChanged ? old.map(tr.mapping, tr.doc) : old;
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
        },

        view(view) {
          let raf = 0;
          let lastSignature = '';

          const makeGap = (
            filler: number,
            padTop: number,
            padLeft: number,
            padRight: number,
            pageNumber: number,
          ) => () => {
            const el = document.createElement('div');
            el.className = 'page-gap';
            el.contentEditable = 'false';

            const fill = document.createElement('div');
            fill.className = 'page-gap-filler';
            fill.style.height = `${filler}px`;

            const band = document.createElement('div');
            band.className = 'page-gap-band';
            band.style.height = `${gap}px`;
            band.style.marginLeft = `-${padLeft}px`;
            band.style.marginRight = `-${padRight}px`;
            band.dataset.page = `${pageNumber}`;

            const top = document.createElement('div');
            top.className = 'page-gap-top';
            top.style.height = `${padTop}px`;

            el.append(fill, band, top);
            return el;
          };

          const recalc = () => {
            const dom = view.dom as HTMLElement;
            if (!dom.isConnected) return;

            const { doc } = view.state;
            const cs = window.getComputedStyle(dom);
            const padTop = parseFloat(cs.paddingTop) || 0;
            const padBottom = parseFloat(cs.paddingBottom) || 0;
            const padLeft = parseFloat(cs.paddingLeft) || 0;
            const padRight = parseFloat(cs.paddingRight) || 0;
            const usable = pageHeight - padTop - padBottom;
            if (usable <= 0) return;

            type PageBreak = { pos: number; filler: number; page: number };
            const breaks: PageBreak[] = [];

            let used = 0; // height consumed on the current page
            let page = 1;

            doc.forEach((_node, offset) => {
              const nodeEl = view.nodeDOM(offset);
              if (!(nodeEl instanceof HTMLElement)) return;

              const ncs = window.getComputedStyle(nodeEl);
              const blockHeight =
                nodeEl.getBoundingClientRect().height +
                (parseFloat(ncs.marginTop) || 0) +
                (parseFloat(ncs.marginBottom) || 0);

              if (used > 0 && used + blockHeight > usable) {
                // Block doesn't fit — push it to the next page.
                breaks.push({
                  pos: offset,
                  filler: usable - used + padBottom,
                  page: page + 1,
                });
                page += 1;
                used = blockHeight;
              } else {
                used += blockHeight;
              }
            });

            // Make the last page render as a full sheet.
            dom.style.minHeight = `${page * pageHeight + (page - 1) * gap}px`;

            const signature = JSON.stringify(
              breaks.map((b) => [b.pos, Math.round(b.filler)]),
            );
            if (signature === lastSignature) return;
            lastSignature = signature;

            const decorations = breaks.map((b) =>
              Decoration.widget(
                b.pos,
                makeGap(b.filler, padTop, padLeft, padRight, b.page),
                {
                  side: -1,
                  key: `page-gap-${b.pos}-${Math.round(b.filler)}`,
                },
              ),
            );

            const tr = view.state.tr.setMeta(
              paginationKey,
              DecorationSet.create(doc, decorations),
            );
            tr.setMeta('addToHistory', false);
            view.dispatch(tr);
          };

          const schedule = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(recalc);
          };

          const onResize = () => schedule();
          window.addEventListener('resize', onResize);
          schedule();

          return {
            update(currentView, prevState) {
              if (!prevState.doc.eq(currentView.state.doc)) schedule();
            },
            destroy() {
              cancelAnimationFrame(raf);
              window.removeEventListener('resize', onResize);
            },
          };
        },
      }),
    ];
  },
});

export default Pagination;