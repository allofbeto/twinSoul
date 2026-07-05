import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Mention from '@tiptap/extension-mention';
import { getCampaignCharacters, getItems } from '../../../api/backendHelpers';
import { createSuggestion } from './MentionSuggestion';
import { Pagination } from './Pagination';
import '../../../styles/SessionEditor.css'

interface Props {
    content: string;
    onChange: (html: string) => void;
    readOnly?: boolean;
    campaignId?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const btn = (action: () => void, label: string, isActive?: boolean) => (
    <button
      type="button"
      className={`editor-menu-btn ${isActive ? 'is-active' : ''}`}
      onClick={action}
    >
      {label}
    </button>
  );

  return (
    <div className="editor-menu-bar">
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'S', editor.isActive('strike'))}
      <div className="editor-menu-divider" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      <div className="editor-menu-divider" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      <div className="editor-menu-divider" />
      {btn(() => editor.chain().focus().setTextAlign('left').run(), '⬅', editor.isActive({ textAlign: 'left' }))}
      {btn(() => editor.chain().focus().setTextAlign('center').run(), '↔', editor.isActive({ textAlign: 'center' }))}
      {btn(() => editor.chain().focus().setTextAlign('right').run(), '➡', editor.isActive({ textAlign: 'right' }))}
      <div className="editor-menu-divider" />
      {btn(() => editor.chain().focus().undo().run(), '↩')}
      {btn(() => editor.chain().focus().redo().run(), '↪')}
      <div className="editor-menu-hint">
        <small>@ character/place · # item/lore</small>
      </div>
    </div>
  );
};

const SessionEditor = ({ content, onChange, readOnly = false, campaignId }: Props) => {
    const characterSuggestion = createSuggestion('@', async (query) => {
        if (!campaignId) return [];
        const res = await getCampaignCharacters(campaignId);
        return res.data
          .filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
          .map((c: any) => ({ id: c.id, label: c.name, type: 'character' }));
    });

    const itemSuggestion = createSuggestion('#', async (query) => {
        const res = await getItems();
        return res.data
            .filter((i: any) => {
            const matchesQuery = i.name.toLowerCase().includes(query.toLowerCase());
            const matchesCampaign = campaignId ? i.campaign_id === campaignId : true;
            return matchesQuery && matchesCampaign;
            })
            .slice(0, 8)
            .map((i: any) => ({ id: i.id, label: i.name, type: 'item' }));
    });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Mention.configure({
        HTMLAttributes: { class: 'mention mention-character' },
        suggestion: characterSuggestion,
      }),
      Mention.extend({ name: 'mentionItem' }).configure({
        HTMLAttributes: { class: 'mention mention-item' },
        suggestion: itemSuggestion,
      }),
      // Pagination only makes sense on the page canvas (edit mode)
      ...(!readOnly
        ? [Pagination.configure({ pageHeight: 1100, gap: 48 })]
        : []),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (readOnly) {
    return (
      <div className="session-editor-readonly">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="session-editor rich-text-edit-mode">
      <MenuBar editor={editor} />
      <div className="editor-canvas">
        <div className="editor-page">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default SessionEditor;