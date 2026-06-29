import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import 'tippy.js/dist/tippy.css';

interface SuggestionItem {
  id: string;
  label: string;
  type: string;
}

interface MentionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
}

const MentionList = forwardRef<any, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--border-radius)',
      padding: '0.5rem',
      color: 'var(--color-text-muted)',
      fontSize: '0.875rem',
    }}>
      No results
    </div>
  );

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--border-radius)',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      minWidth: '200px',
    }}>
      {items.map((item, index) => (
        <div
          key={item.id}
          onClick={() => selectItem(index)}
          style={{
            padding: '0.5rem 0.75rem',
            cursor: 'pointer',
            background: index === selectedIndex ? 'var(--color-primary)' : 'transparent',
            color: index === selectedIndex ? '#fff' : 'var(--color-text)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{
            fontSize: '0.7rem',
            padding: '0.1rem 0.4rem',
            borderRadius: '999px',
            background: index === selectedIndex ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-raised)',
            color: index === selectedIndex ? '#fff' : 'var(--color-text-muted)',
          }}>
            {item.type}
          </span>
          {item.label}
        </div>
      ))}
    </div>
  );
});

export const createSuggestion = (
  trigger: string,
  fetchItems: (query: string) => Promise<SuggestionItem[]>
) => ({
  char: trigger,
  items: async ({ query }: { query: string }) => {
    return fetchItems(query);
  },
  render: () => {
    let component: ReactRenderer;
    let popup: TippyInstance[];

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },
      onUpdate: (props: any) => {
        component.updateProps(props);
        popup[0].setProps({ getReferenceClientRect: props.clientRect });
      },
      onKeyDown: (props: any) => {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return (component.ref as any)?.onKeyDown(props);
      },
      onExit: () => {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
});