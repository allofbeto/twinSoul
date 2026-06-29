import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

interface Props {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
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
    }}>
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'S', editor.isActive('strike'))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
      {btn(() => editor.chain().focus().setTextAlign('left').run(), '⬅', editor.isActive({ textAlign: 'left' }))}
      {btn(() => editor.chain().focus().setTextAlign('center').run(), '↔', editor.isActive({ textAlign: 'center' }))}
      {btn(() => editor.chain().focus().setTextAlign('right').run(), '➡', editor.isActive({ textAlign: 'right' }))}
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem' }} />
      {btn(() => editor.chain().focus().undo().run(), '↩')}
      {btn(() => editor.chain().focus().redo().run(), '↪')}
    </div>
  );
};

const RichTextEditor = ({ content, onChange, readOnly = false }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // sync readOnly
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  return (
    <div
      className={!readOnly ? 'rich-text-edit-mode' : ''}
      style={{
        border: readOnly ? 'none' : '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        background: readOnly ? 'transparent' : '#ffffff',
      }}
    >
      {!readOnly && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
        style={{
          padding: readOnly ? '0' : '0.75rem',
          minHeight: readOnly ? 'auto' : '200px',
        }}
      />
    </div>
  );
};

export default RichTextEditor;