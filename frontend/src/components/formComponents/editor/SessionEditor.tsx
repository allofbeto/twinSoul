import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Mention from '@tiptap/extension-mention';
import { getCampaignCharacters, getItems } from '../../../api/backendHelpers';
import { createSuggestion } from './MentionSuggestion';

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
      onClick={action}
      style={{
        background: isActive ? 'var(--color-primary)' : 'transparent',
        color: isActive ? '#fff' : 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        padding: '0.2rem 0.5rem',
        fontSize: '0.8rem',
        cursor: 'pointer',
        fontWeight: isActive ? 700 : 400,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.25rem',
      padding: '0.5rem',
      borderBottom: '1px solid var(--color-border)',
      marginBottom: '0.5rem',
      alignItems: 'center',
    }}>
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'S', editor.isActive('strike'))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem', height: '20px' }} />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem', height: '20px' }} />
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem', height: '20px' }} />
      {btn(() => editor.chain().focus().setTextAlign('left').run(), '⬅', editor.isActive({ textAlign: 'left' }))}
      {btn(() => editor.chain().focus().setTextAlign('center').run(), '↔', editor.isActive({ textAlign: 'center' }))}
      {btn(() => editor.chain().focus().setTextAlign('right').run(), '➡', editor.isActive({ textAlign: 'right' }))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem', height: '20px' }} />
      {btn(() => editor.chain().focus().undo().run(), '↩')}
      {btn(() => editor.chain().focus().redo().run(), '↪')}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <small style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
          @ character/place · # item/lore
        </small>
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
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div
      className={!readOnly ? 'rich-text-edit-mode' : ''}
      style={{
        border: readOnly ? 'none' : '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        background: readOnly ? 'transparent' : '#ffffff',
        minHeight: readOnly ? 'auto' : '400px',
      }}
    >
      {!readOnly && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
        style={{
          padding: readOnly ? '0' : '1rem',
          minHeight: readOnly ? 'auto' : '350px',
        }}
      />
    </div>
  );
};

export default SessionEditor;