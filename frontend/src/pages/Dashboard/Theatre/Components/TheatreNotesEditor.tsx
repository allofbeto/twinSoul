import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  CampaignObjectMention,
  createSlashCommandSuggestion,
  type CreateCampaignObject,
} from '../../../../components/formComponents/editor/CampaignObjectMention';

interface TheatreNotesEditorProps {
  content: string;
  onChange: (html: string) => void;
  saveLabel?: string;
  onCreateObject?: CreateCampaignObject;
}

export default function TheatreNotesEditor({ content, onChange, saveLabel, onCreateObject }: TheatreNotesEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ...(onCreateObject
        ? [CampaignObjectMention.configure({
            HTMLAttributes: { class: 'mention mention-object' },
            suggestion: createSlashCommandSuggestion(onCreateObject),
          })]
        : []),
    ],
    content,
    editorProps: {
      attributes: { class: 'theatre__notes-html theatre__notes-editable' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Only resync when the content diverges from what the editor already holds —
  // i.e. an external change (switching sessions), not our own onUpdate echoing back.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const btn = (action: () => void, label: string, isActive?: boolean) => (
    <button
      type="button"
      className={`theatre__mini ${isActive ? 'is-on' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      {label}
    </button>
  );

  return (
    <div className="theatre__notes-editor">
      <div className="theatre__notes-toolbar">
        {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
        {btn(() => editor.chain().focus().toggleStrike().run(), 'S', editor.isActive('strike'))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
        {btn(() => editor.chain().focus().toggleBulletList().run(), '•', editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), '1.', editor.isActive('orderedList'))}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
        {btn(() => editor.chain().focus().undo().run(), '↩')}
        {btn(() => editor.chain().focus().redo().run(), '↪')}
        {onCreateObject && <span className="theatre__notes-hint">/ new NPC/item/location…</span>}
        {saveLabel && <span className="theatre__notes-save">{saveLabel}</span>}
      </div>
      <EditorContent editor={editor} className="theatre__notes-scroll" />
    </div>
  );
}
