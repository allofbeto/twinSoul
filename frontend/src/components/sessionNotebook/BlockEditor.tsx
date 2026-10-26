import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Mention from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';
import { getItems } from '../../api/backendHelpers';
import { KIND_LABEL, KIND_ORDER, loadRefs } from './refs';
import { createSuggestion } from '../formComponents/editor/MentionSuggestion';
import {
  CampaignObjectMention,
  kindIcon,
  createSlashCommandSuggestion,
  type CreateCampaignObject,
} from '../formComponents/editor/CampaignObjectMention';

// @-mention node that remembers what it points at (character / npc / item /
// location). Same node name as before, so notes tagged with the old plain
// "@name" chips still load.
const RefMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      kind: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-kind'),
        renderHTML: (a: { kind?: string | null }) => (a.kind ? { 'data-kind': a.kind } : {}),
      },
    };
  },
}).configure({
  renderHTML: ({ node }): any =>
    node.attrs.kind ? `${kindIcon(node.attrs.kind) ?? ''} ${node.attrs.label ?? node.attrs.id}` : `@${node.attrs.label ?? node.attrs.id}`,
  renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
});

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  campaignId?: string;
  onCreateObject?: CreateCampaignObject;
}

// One small rich-text field per block. Keeps the @ character, # item and
// "/" create-object tagging from the old full-page editor.
export default function BlockEditor({ content, onChange, placeholder, campaignId, onCreateObject }: Props) {
  // Quick-create needs somewhere to put the new NPC/item/location: a campaign.
  const canQuickCreate = !!onCreateObject && !!campaignId;
  const extensions = useMemo(() => {
    // "@*" is the quick-create trigger, so the normal "@" search stands down for it.
    const refs = createSuggestion('@', async (query) => {
      const q = query.toLowerCase();
      return (await loadRefs(campaignId))
        .filter((r) => r.label.toLowerCase().includes(q))
        .sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind))
        .slice(0, 10)
        .map((r) => ({ ...r, type: KIND_LABEL[r.kind] ?? r.kind }));
    }, (q) => canQuickCreate && q.startsWith('*'));
    const items = createSuggestion('#', async (query) => {
      const res = await getItems();
      return res.data
        .filter(
          (i: any) =>
            i.name.toLowerCase().includes(query.toLowerCase()) && (campaignId ? i.campaign_id === campaignId : true)
        )
        .slice(0, 8)
        .map((i: any) => ({ id: i.id, label: i.name, type: 'item' }));
    });
    return [
      StarterKit,
      Underline,
      RefMention.configure({ HTMLAttributes: { class: 'mention mention-character' }, suggestion: refs }),
      Mention.extend({ name: 'mentionItem' }).configure({
        HTMLAttributes: { class: 'mention mention-item' },
        suggestion: items,
      }),
      // "@*" → pick NPC / Item / Location → name it → it's created in the campaign and tagged here.
      ...(canQuickCreate
        ? [
            CampaignObjectMention.extend({ name: 'campaignObjectStar' }).configure({
              HTMLAttributes: { class: 'mention mention-object' },
              suggestion: createSlashCommandSuggestion(onCreateObject!, {
                char: '@*',
                kinds: ['npc', 'item', 'map'],
                pluginKey: new PluginKey('campaignObjectStar'),
              }),
            }),
          ]
        : []),
      ...(onCreateObject
        ? [
            CampaignObjectMention.configure({
              HTMLAttributes: { class: 'mention mention-object' },
              suggestion: createSlashCommandSuggestion(onCreateObject),
            }),
          ]
        : []),
    ];
    // Extensions are built once per editor instance on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, !!onCreateObject]);

  const editor = useEditor({
    extensions,
    content,
    editorProps: { attributes: { class: 'nb-editable', 'data-placeholder': placeholder ?? 'Write here…' } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  // Resync only when the content changed externally (not our own echo).
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !(content === '' && editor.isEmpty)) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const btn = (action: () => void, label: string, active?: boolean) => (
    <button
      type="button"
      className={`nb-fmt ${active ? 'is-on' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      {label}
    </button>
  );

  return (
    <div className="nb-field">
      <div className="nb-toolbar">
        {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
        {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
        <span className="nb-hint">@ character, NPC, place or item{canQuickCreate ? ' · @* create new' : ''} · # item</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
