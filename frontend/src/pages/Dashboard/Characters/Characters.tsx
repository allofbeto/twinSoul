import React, { useEffect, useState } from 'react';
import { getCharacters, deleteCharacter } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';

interface Character {
  id: string;
  name: string;
  race: string;
  classes: string[];
  level: number;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  game: string;
}

const Characters = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchCharacters = async () => {
    try {
      const res = await getCharacters();
      setCharacters(res.data);
    } catch (err: any) {
      setError('Could not load characters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this character?')) return;
    try {
      await deleteCharacter(id);
      setCharacters(characters.filter((c) => c.id !== id));
    } catch {
      setError('Could not delete character.');
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Characters</h2>
          <p className="text-muted-theme mb-0">Your roster of adventurers.</p>
        </div>
        <button
          className="btn btn-theme-primary"
          onClick={() => navigate('/dashboard/characters/new')}
        >
          + New Character
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {characters.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">No characters yet. Create your first one!</p>
        </div>
      ) : (
        <div className="row g-3">
          {characters.map((character) => (
            <div className="col-md-6 col-lg-4" key={character.id}>
              <div className="card-theme p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <h5 className="text-theme mb-1">{character.name}</h5>
                  <p className="text-muted-theme mb-2">
                    {character.race} — {character.classes.join(', ')} (Lvl {character.level})
                  </p>
                  <div className="d-flex gap-3">
                    <small className="text-muted-theme">HP: {character.current_hp}/{character.max_hp}</small>
                    <small className="text-muted-theme">AC: {character.armor_class}</small>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button
                    className="btn btn-theme-primary btn-sm"
                    onClick={() => navigate(`/dashboard/characters/${character.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(character.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Characters;