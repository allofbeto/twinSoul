import React from 'react';

interface Props {
  notes: string;
  isOwner: boolean;
  onChange: (notes: string) => void;
}

// Free-form notes: backstory, allies, the name of that suspicious innkeeper.
// Saves as you type, like the rest of the play state.
const NotesPanel = ({ notes, isOwner, onChange }: Props) => (
  isOwner ? (
    <textarea
      className="sheet-notes"
      value={notes}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Backstory, allies, rivals, promises made, clues found..."
      aria-label="Character notes"
    />
  ) : notes ? (
    <div className="sheet-notes sheet-notes--readonly">{notes}</div>
  ) : (
    <p className="text-muted-theme mb-0">No notes yet.</p>
  )
);

export default NotesPanel;
