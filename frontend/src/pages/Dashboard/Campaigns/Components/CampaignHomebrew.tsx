import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomebrewReviews, reviewCharacterHomebrew } from '../../../../api/backendHelpers';
import { CharRace } from '../../Characters/raceTypes';
import { CharClass } from '../../Characters/classTypes';
import { HomebrewStatusChip } from '../../Characters/Components/HomebrewStatusNotice';
import '../../../../styles/homebrew.css';

interface ReviewCharacter {
  id: string;
  name: string;
  race: string;
  level: number;
  classes: string[];
  player_name: string;
  homebrew_status: 'pending' | 'approved' | 'rejected';
  homebrew_review_note: string | null;
  homebrew_reviewed_at: string | null;
  homebrew_races: CharRace[];
  homebrew_classes: CharClass[];
}

interface Props {
  campaignId: string;
  onPendingCountChange?: (count: number) => void;
}

const fmtBonus = (b: { ability_score: string; bonus: number }) => `${b.ability_score.toUpperCase()} ${b.bonus > 0 ? '+' : ''}${b.bonus}`;

const Paragraphs = ({ desc }: { desc: string | string[] }) => (
  <>
    {(Array.isArray(desc) ? desc : [desc]).filter(Boolean).map((d, i) => (
      <p key={i} className="text-muted-theme mb-1" style={{ fontSize: '0.78rem', marginLeft: '0.5rem' }}>{d}</p>
    ))}
  </>
);

const SourceLink = ({ url }: { url?: string | null }) =>
  url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem' }}>Source page ↗</a>
  ) : (
    <span className="text-muted-theme" style={{ fontSize: '0.78rem' }}>Built by hand</span>
  );

const RaceDetails = ({ race }: { race: CharRace }) => (
  <details className="mb-2" open>
    <summary className="text-theme" style={{ cursor: 'pointer' }}>
      <strong>Race: {race.name}</strong> <span className="homebrew-badge ms-1">Homebrew</span>
    </summary>
    <div className="mt-2 ms-2">
      <div className="d-flex flex-wrap gap-2 align-items-center mb-2" style={{ fontSize: '0.8rem' }}>
        <span className="text-muted-theme">Speed {race.speed} ft. · {race.size}</span>
        {race.ability_bonuses.map((b) => <span key={b.ability_score} className="badge-cls">{fmtBonus(b)}</span>)}
        <SourceLink url={race.source_url} />
      </div>
      {race.description && <p className="text-theme mb-2" style={{ fontSize: '0.82rem' }}>{race.description}</p>}
      {race.traits.map((t) => (
        <div key={t.index} style={{ fontSize: '0.82rem' }}>
          <span className="text-theme">{t.name}</span>
          <Paragraphs desc={t.desc} />
        </div>
      ))}
      {race.subraces.map((sr) => (
        <div key={sr.index} className="homebrew-subsection mt-2" style={{ fontSize: '0.82rem' }}>
          <span className="text-theme">Subrace: {sr.name}</span>{' '}
          {sr.ability_bonuses.map((b) => <span key={b.ability_score} className="badge-cls ms-1">{fmtBonus(b)}</span>)}
          <Paragraphs desc={sr.desc} />
          {sr.racial_traits.map((t) => (
            <div key={t.index}>
              <span className="text-theme">{t.name}</span>
              <Paragraphs desc={t.desc} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </details>
);

const ClassDetails = ({ cls }: { cls: CharClass }) => {
  const features = cls.levels.flatMap((l) => l.features.map((f) => ({ ...f, level: l.level })));
  return (
    <details className="mb-2" open>
      <summary className="text-theme" style={{ cursor: 'pointer' }}>
        <strong>Class: {cls.name}</strong> <span className="homebrew-badge ms-1">Homebrew</span>
      </summary>
      <div className="mt-2 ms-2">
        <div className="d-flex flex-wrap gap-2 align-items-center mb-2" style={{ fontSize: '0.8rem' }}>
          <span className="text-muted-theme">
            Hit die d{cls.hit_die}
            {cls.saving_throws.length > 0 && ` · Saves ${cls.saving_throws.map((s) => s.toUpperCase()).join(', ')}`}
            {cls.spellcasting_ability && ` · Casts with ${cls.spellcasting_ability.toUpperCase()}`}
          </span>
          <SourceLink url={cls.source_url} />
        </div>
        {cls.description && <p className="text-theme mb-2" style={{ fontSize: '0.82rem' }}>{cls.description}</p>}
        {cls.proficiencies.length > 0 && (
          <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>Proficiencies: {cls.proficiencies.join(', ')}</p>
        )}
        {features.map((f, i) => (
          <div key={`${f.level}-${f.index}-${i}`} style={{ fontSize: '0.82rem' }}>
            <span className="text-muted-theme">Lvl {f.level}</span> <span className="text-theme">{f.name}</span>
            <Paragraphs desc={f.desc} />
          </div>
        ))}
        {cls.subclasses.map((sc) => (
          <div key={sc.index} className="homebrew-subsection mt-2" style={{ fontSize: '0.82rem' }}>
            <span className="text-theme">{sc.subclass_flavor}: {sc.name}</span>
            <Paragraphs desc={sc.desc} />
            {sc.levels.flatMap((l) => l.features.map((f) => (
              <div key={`${l.level}-${f.index}`}>
                <span className="text-muted-theme">Lvl {l.level}</span> <span className="text-theme">{f.name}</span>
                <Paragraphs desc={f.desc} />
              </div>
            )))}
          </div>
        ))}
      </div>
    </details>
  );
};

const ReviewCard = ({ character, onReviewed }: { character: ReviewCharacter; onReviewed: (c: ReviewCharacter) => void }) => {
  const navigate = useNavigate();
  const [note, setNote] = useState(character.homebrew_review_note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(true);
    setError('');
    try {
      const res = await reviewCharacterHomebrew(character.id, decision, note.trim() || undefined);
      onReviewed(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save your decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-theme p-3 homebrew-review-card">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap">
        <div>
          <h6 className="text-theme mb-0">
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              onClick={() => navigate(`/dashboard/characters/${character.id}`)}
            >
              {character.name}
            </button>
          </h6>
          <small className="text-muted-theme">
            {character.player_name} · {character.race} · Level {character.level}
            {character.classes.length > 0 && ` · ${character.classes.join(' / ')}`}
          </small>
        </div>
        <HomebrewStatusChip status={character.homebrew_status} />
      </div>

      {character.homebrew_races.map((r) => <RaceDetails key={r.id} race={r} />)}
      {character.homebrew_classes.map((c) => <ClassDetails key={c.id} cls={c} />)}

      <div className="homebrew-review-actions mt-3">
        {error && <div className="alert alert-danger py-1 px-2" style={{ fontSize: '0.8rem' }}>{error}</div>}
        <label className="form-label text-muted-theme mb-1" style={{ fontSize: '0.78rem' }} htmlFor={`note-${character.id}`}>
          Note to the player (optional)
        </label>
        <textarea
          id={`note-${character.id}`}
          className="form-control input-theme form-control-sm mb-2"
          rows={1}
          placeholder="e.g. Fine, but flight only works without medium or heavy armor."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="d-flex gap-2 justify-content-end">
          {character.homebrew_status !== 'rejected' && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => decide('reject')} disabled={busy}>
              {character.homebrew_status === 'approved' ? 'Revoke approval' : 'Reject'}
            </button>
          )}
          {character.homebrew_status !== 'approved' && (
            <button type="button" className="btn btn-sm btn-theme-primary" onClick={() => decide('approve')} disabled={busy}>
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// DM-only queue of player characters whose homebrew needs a verdict before
// they can join the table.
const CampaignHomebrew = ({ campaignId, onPendingCountChange }: Props) => {
  const [characters, setCharacters] = useState<ReviewCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getHomebrewReviews(campaignId);
      setCharacters(res.data);
    } catch {
      setError('Could not load homebrew reviews.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    onPendingCountChange?.(characters.filter((c) => c.homebrew_status === 'pending').length);
  }, [characters, onPendingCountChange]);

  const handleReviewed = (updated: ReviewCharacter) =>
    setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  if (loading) return <p className="text-muted-theme">Loading…</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const pending = characters.filter((c) => c.homebrew_status === 'pending');
  const reviewed = characters.filter((c) => c.homebrew_status !== 'pending');

  return (
    <div>
      <div className="card-theme p-4 mb-3">
        <h5 className="text-theme mb-1">Homebrew review</h5>
        <p className="text-muted-theme mb-0" style={{ fontSize: '0.85rem' }}>
          Characters built with homebrew races or classes wait here until you approve them. Until then they can't be added to initiative, and other players don't see them.
          If a player changes the homebrew later, the character comes back here.
        </p>
      </div>

      {pending.length === 0 && (
        <p className="text-muted-theme">Nothing waiting for review.</p>
      )}
      {pending.map((c) => <ReviewCard key={c.id} character={c} onReviewed={handleReviewed} />)}

      {reviewed.length > 0 && (
        <>
          <h6 className="text-theme mt-4 mb-2">Already reviewed</h6>
          {reviewed.map((c) => <ReviewCard key={c.id} character={c} onReviewed={handleReviewed} />)}
        </>
      )}
    </div>
  );
};

export default CampaignHomebrew;
