import React from 'react';
import { GAME_SYSTEMS } from '../gameSystems';

interface Props {
  onSelect: (gameKey: string) => void;
}

const GameSystemPicker = ({ onSelect }: Props) => {
  return (
    <div>
      <h2 className="text-theme mb-1">New Character</h2>
      <p className="text-muted-theme mb-4">Which game are you building this character for?</p>

      <div className="row g-3">
        {GAME_SYSTEMS.map((g) => (
          <div className="col-md-4" key={g.key}>
            <div
              className="card-theme p-4 h-100"
              style={{
                cursor: g.enabled ? 'pointer' : 'not-allowed',
                opacity: g.enabled ? 1 : 0.5,
                position: 'relative',
              }}
              onClick={() => g.enabled && onSelect(g.key)}
            >
              {!g.enabled && (
                <span
                  className="badge-cls"
                  style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.7rem' }}
                >
                  Coming soon
                </span>
              )}
              <h5 className="text-theme mb-2">{g.name}</h5>
              <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>{g.tagline}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameSystemPicker;
