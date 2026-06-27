import React from 'react';
import { DND_CLASSES } from '../constants';

interface Props {
  selected: string[];
  onToggle: (cls: string) => void;
}

const ClassSelector = ({ selected, onToggle }: Props) => {
  return (
    <div className="card-theme p-4 mb-4">
      <h5 className="text-theme mb-3">Classes</h5>
      <div className="d-flex flex-wrap gap-2">
        {DND_CLASSES.map((cls) => (
          <button
            type="button"
            key={cls}
            className={`btn btn-sm ${selected.includes(cls) ? 'btn-theme-primary' : 'btn-outline-secondary'}`}
            onClick={() => onToggle(cls)}
          >
            {cls}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClassSelector;