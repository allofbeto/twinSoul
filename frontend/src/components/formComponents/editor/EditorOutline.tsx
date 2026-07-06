import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'boxicons/css/boxicons.min.css';
import type { Editor } from '@tiptap/react';

interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

interface Props {
  editor: Editor | null;
}

/** Vertical offset when scrolling to a heading (sticky toolbar clearance) */
const SCROLL_OFFSET = 110;
/** A heading counts as "active" once its top passes this line */
const SPY_LINE = 140;

const buildOutline = (editor: Editor): OutlineItem[] => {
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level <= 3) {
      items.push({
        level: node.attrs.level,
        text: node.textContent,
        pos,
      });
    }
  });
  return items;
};

const EditorOutline = ({ editor }: Props) => {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [open, setOpen] = useState<boolean>(
    () => typeof window === 'undefined' || window.innerWidth > 900,
  );
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(-1);
  const rafRef = useRef(0);

  // Rebuild the outline whenever the document changes
  useEffect(() => {
    if (!editor) return;
    const update = () => setItems(buildOutline(editor));
    update();
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
  }, [editor]);

  const itemKey = (item: OutlineItem, index: number) =>
    `${index}-${item.level}-${item.text}`;

  // Flat list -> visible rows, honoring collapsed ancestors
  const visibleItems = useMemo(() => {
    const out: { item: OutlineItem; index: number; hasChildren: boolean }[] = [];
    let hideDeeperThan: number | null = null;

    items.forEach((item, index) => {
      if (hideDeeperThan !== null && item.level > hideDeeperThan) return;
      hideDeeperThan = null;

      const next = items[index + 1];
      const hasChildren = !!next && next.level > item.level;
      out.push({ item, index, hasChildren });

      if (hasChildren && collapsedKeys.has(itemKey(item, index))) {
        hideDeeperThan = item.level;
      }
    });

    return out;
  }, [items, collapsedKeys]);

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const scrollTo = (pos: number) => {
    if (!editor) return;
    try {
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) {
        const top = dom.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    } catch {
      /* position no longer valid; outline will refresh on next update */
    }
  };

  // Scroll spy — highlight the section currently in view
  useEffect(() => {
    if (!editor || items.length === 0) {
      setActiveIndex(-1);
      return;
    }

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        let current = -1;
        items.forEach((item, i) => {
          try {
            const dom = editor.view.nodeDOM(item.pos);
            if (
              dom instanceof HTMLElement &&
              dom.getBoundingClientRect().top <= SPY_LINE
            ) {
              current = i;
            }
          } catch {
            /* stale position mid-update; skip */
          }
        });
        setActiveIndex(current);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, items]);

  if (!editor) return null;

  return (
    <div className={`editor-outline ${open ? 'is-open' : 'is-closed'}`}>
      <button
        type="button"
        className="outline-toggle"
        onClick={() => setOpen(!open)}
        title={open ? 'Hide outline' : 'Show outline'}
      >
        <i className={`bx ${open ? 'bx-chevron-left' : 'bx-chevron-right'}`} />
      </button>

      {open && (
        <div className="outline-body">
          <div className="outline-title">Outline</div>

          {items.length === 0 && (
            <div className="outline-empty">
              Add H1–H3 headings to build your outline.
            </div>
          )}

          <ul className="outline-list">
            {visibleItems.map(({ item, index, hasChildren }) => {
              const key = itemKey(item, index);
              const isCollapsed = collapsedKeys.has(key);
              return (
                <li
                  key={key}
                  className={`outline-item level-${item.level} ${
                    index === activeIndex ? 'is-active' : ''
                  }`}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className={`outline-caret ${isCollapsed ? 'is-collapsed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(key);
                      }}
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      ▾
                    </button>
                  ) : (
                    <span className="outline-caret-spacer" />
                  )}
                  <button
                    type="button"
                    className="outline-link"
                    onClick={() => scrollTo(item.pos)}
                  >
                    {item.text || 'Untitled'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EditorOutline;