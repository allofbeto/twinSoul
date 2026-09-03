import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import 'tippy.js/dist/tippy.css';
import type { AssetKind } from '../../../pages/Dashboard/Theatre/Components/types';

export type CreateCampaignObject = (
  data: { name: string; kind: AssetKind }
) => Promise<{ id: string; title: string }>;

interface KindOption {
  id: string;
  type: AssetKind;
  label: string;
  icon: string;
}

// "New Location" intentionally maps to the existing 'map' kind/tray tab —
// there is no separate 'location' AssetKind.
const SLASH_KIND_OPTIONS: KindOption[] = [
  { id: 'npc', type: 'npc', label: 'New NPC', icon: '🧙' },
  { id: 'item', type: 'item', label: 'New Item', icon: '🗡️' },
  { id: 'map', type: 'map', label: 'New Location', icon: '🗺️' },
  { id: 'encounter', type: 'encounter', label: 'New Encounter', icon: '⚔️' },
  { id: 'art', type: 'art', label: 'New Art', icon: '🖼️' },
];

const MENTION_ICON = SLASH_KIND_OPTIONS.reduce((acc, o) => {
  acc[o.type] = o.icon;
  return acc;
}, {} as Record<AssetKind, string>);

// The node itself: a Mention variant that also carries a `kind`, rendered as
// an icon + label chip (e.g. "🧙 Goblin Chief") instead of Mention's default "@label".
export const CampaignObjectMention = Mention.extend({
  name: 'campaignObject',
  addAttributes() {
    return {
      ...this.parent?.(),
      kind: {
        default: 'item',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-kind'),
        renderHTML: (attributes: { kind?: string }) =>
          (attributes.kind ? { 'data-kind': attributes.kind } : {}),
      },
    };
  },
}).configure({
  // The runtime happily accepts a plain string here (it wraps it in the
  // mention <span> itself) even though the type declares DOMOutputSpec only.
  renderHTML: ({ node }): any => `${MENTION_ICON[node.attrs.kind as AssetKind] ?? '📌'} ${node.attrs.label ?? node.attrs.id}`,
  renderText: ({ node }) => `${MENTION_ICON[node.attrs.kind as AssetKind] ?? '📌'} ${node.attrs.label ?? node.attrs.id}`,
});

// --- Step 1: kind picker (Suggestion-driven, same shape as the @/# popups) ---

const SlashKindList = forwardRef<any, { items: KindOption[]; command: (item: KindOption) => void }>(
  ({ items, command }, ref) => {
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

    if (!items.length) {
      return (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)', padding: '0.5rem',
          color: 'var(--color-text-muted)', fontSize: '0.875rem',
        }}>
          No matches
        </div>
      );
    }

    return (
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)', overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minWidth: '180px',
      }}>
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => selectItem(index)}
            style={{
              padding: '0.5rem 0.75rem', cursor: 'pointer',
              background: index === selectedIndex ? 'var(--color-primary)' : 'transparent',
              color: index === selectedIndex ? '#fff' : 'var(--color-text)',
              fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    );
  },
);

// --- Step 2: name entry (its own independent popup, not Suggestion-driven,
// so it can stay open across the async create call) ---

interface NameEntryProps {
  icon: string;
  kindLabel: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

const SlashNameEntry = forwardRef<any, NameEntryProps>(({ icon, kindLabel, onSubmit, onCancel }, ref) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'Escape') {
        onCancel();
        return true;
      }
      return false;
    },
  }));

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch {
      setError('Could not create — try again.');
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        padding: '0.6rem 0.75rem', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.4rem',
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{icon} {kindLabel}</div>
      <input
        autoFocus
        placeholder="Name…"
        value={name}
        disabled={saving}
        onChange={(e) => setName(e.target.value)}
        style={{
          background: 'var(--color-background)', color: 'var(--color-text)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)',
          padding: '0.4rem 0.5rem', font: 'inherit', fontSize: '0.875rem',
        }}
      />
      {error && <div style={{ color: 'var(--color-error)', fontSize: '0.78rem' }}>{error}</div>}
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
        {saving ? 'Creating…' : 'Enter to create · Esc to cancel'}
      </div>
    </form>
  );
});

export const createSlashCommandSuggestion = (onCreateObject: CreateCampaignObject) => {
  const openNameEntry = (editor: any, item: KindOption, insertPos: number) => {
    let nameComponent: ReactRenderer | null = null;
    let namePopup: TippyInstance[] | null = null;
    const teardown = () => {
      namePopup?.[0]?.destroy();
      nameComponent?.destroy();
    };

    const coords = editor.view.coordsAtPos(insertPos);
    const rect = () => new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);

    nameComponent = new ReactRenderer(SlashNameEntry, {
      props: {
        icon: item.icon,
        kindLabel: item.label.replace(/^New /, ''),
        onCancel: teardown,
        onSubmit: async (name: string) => {
          const created = await onCreateObject({ name, kind: item.type });
          editor.chain().focus().insertContentAt(insertPos, [
            { type: 'campaignObject', attrs: { id: created.id, label: created.title, kind: item.type, mentionSuggestionChar: '/' } },
            { type: 'text', text: ' ' },
          ]).run();
          teardown();
        },
      },
      editor,
    });

    namePopup = tippy('body', {
      getReferenceClientRect: rect,
      appendTo: () => document.body,
      content: nameComponent.element,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
      onHidden: teardown,
    });

    // `autoFocus` fires while the input is still detached (ReactRenderer mounts it
    // before tippy attaches `content` to the document), so it silently no-ops.
    // Focus explicitly now that the element is actually in the DOM.
    (nameComponent.element as HTMLElement).querySelector('input')?.focus();
  };

  return {
    char: '/',
    items: ({ query }: { query: string }) =>
      SLASH_KIND_OPTIONS.filter(
        (o) => o.label.toLowerCase().includes(query.toLowerCase()) || o.type.includes(query.toLowerCase()),
      ),
    render: () => {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(SlashKindList, { props, editor: props.editor });
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
    command: ({ editor, range, props }: any) => {
      const item = props as KindOption;
      editor.chain().focus().deleteRange(range).run();
      openNameEntry(editor, item, range.from);
    },
  };
};
