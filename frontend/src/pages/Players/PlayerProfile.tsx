import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlayerProfile } from '../../api/backendHelpers';

interface Character {
  id: string;
  name: string;
  race: string;
  level: number;
  classes: string[];
  profile_image?: { url: string };
}

interface PlayerUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const PlayerProfile = () => {
    const { id: campaignId, playerId } = useParams();
    const navigate = useNavigate();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [player, setPlayer] = useState<PlayerUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
          try {
            const res = await getPlayerProfile(campaignId!, playerId!);
            setPlayer(res.data.user);
            setCharacters(res.data.characters);
          } catch {
            console.error('Could not load player profile');
          } finally {
            setLoading(false);
          }
        };
        fetch();
    }, [campaignId, playerId]);

    if (loading) return <p className="text-muted-theme">Loading...</p>;

    return (
        <div>
        <div className="d-flex align-items-center gap-3 mb-4">
            <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate(`/dashboard/campaigns/${campaignId}`)}
            >
            ← Back
            </button>
            {player && (
            <div>
                <h2 className="text-theme mb-0">{player.first_name} {player.last_name}</h2>
                <small className="text-muted-theme">{player.email}</small>
            </div>
            )}
        </div>

        <div className="card-theme p-4">
            <h5 className="text-theme mb-3">Characters in this Campaign</h5>

            {characters.length === 0 ? (
            <p className="text-muted-theme">No characters linked to this campaign.</p>
            ) : (
            <div className="row g-3">
                {characters.map((character) => (
                <div className="col-md-6" key={character.id}>
                    <div
                    className="card-theme p-3 d-flex gap-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/characters/${character.id}`)}
                    >
                    {character.profile_image?.url && (
                        <img
                        src={character.profile_image.url}
                        alt={character.name}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 'var(--border-radius)' }}
                        />
                    )}
                    <div>
                        <h5 className="text-theme mb-1">{character.name}</h5>
                        <p className="text-muted-theme mb-1" style={{ fontSize: '0.875rem' }}>
                        {character.race} — Level {character.level}
                        </p>
                        {character.classes.length > 0 && (
                        <div className="d-flex flex-wrap gap-1">
                            {character.classes.map((cls) => (
                            <span key={cls} className="badge-cls" style={{ fontSize: '0.7rem' }}>{cls}</span>
                            ))}
                        </div>
                        )}
                    </div>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
        </div>
    );
};

export default PlayerProfile;