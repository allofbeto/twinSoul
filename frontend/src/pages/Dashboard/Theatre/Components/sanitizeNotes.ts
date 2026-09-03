import DOMPurify from 'dompurify';

// Sanitize Tiptap HTML while keeping the bits Tiptap relies on:
// link target/rel, and mention data-* attributes.
const NOTES_SANITIZE_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'data-type', 'data-id', 'data-label', 'data-mention-suggestion-char', 'data-kind'],
};

export const renderNotes = (html: string) => DOMPurify.sanitize(html, NOTES_SANITIZE_CONFIG);

// Plain-text rendering of notes HTML, for clamped previews (tray cards) where markup would break the layout.
export const notesPreviewText = (html: string) =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
