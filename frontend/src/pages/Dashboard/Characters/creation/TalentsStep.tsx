import React from 'react';
import { DND_SKILLS } from '../constants';
import { ABILITY_META, AbilityKey, Scores, modifier, signed } from './builderData';
import { GrantedSkill, KnownLanguage, SkillPool } from './skillSources';
import { EXOTIC_LANGUAGES, STANDARD_LANGUAGES } from '../languages';

interface Props {
  granted: GrantedSkill[];
  pools: SkillPool[];
  picks: Record<string, string[]>; // already sanitized
  onToggle: (poolKey: string, skill: string) => void;
  scores: Scores;
  languages: {
    known: KnownLanguage[];
    pools: SkillPool[];
    picks: Record<string, string[]>;
    onToggle: (poolKey: string, language: string) => void;
  };
}

const abilityOf = (skill: string) => DND_SKILLS.find((s) => s.name === skill)?.ability as AbilityKey;

// Skills arrive from several places: some are given, the rest are chosen per source.
const TalentsStep = ({ granted, pools, picks, onToggle, scores, languages }: Props) => {
  const owner = (skill: string) =>
    granted.find((g) => g.skill === skill)?.source ?? pools.find((p) => picks[p.key]?.includes(skill))?.source;

  const skillMod = (skill: string) => {
    const key = abilityOf(skill);
    return <span className="builder-skill-ability">{ABILITY_META[key].short} {signed(modifier(scores[key]))}</span>;
  };

  return (
    <div className="talents">
      {granted.length > 0 && (
        <section className="talents-section">
          <div className="talents-head">
            <span className="race-section-label m-0">Already trained</span>
          </div>
          <div className="builder-skills">
            {granted.map((g) => (
              <div key={g.skill} className="builder-skill is-picked is-granted">
                <span>
                  <span className="builder-skill-name">{g.skill}</span>
                  <small className="talents-from">from {g.source}</small>
                </span>
                {skillMod(g.skill)}
              </div>
            ))}
          </div>
        </section>
      )}

      {pools.map((pool) => {
        const mine = picks[pool.key] || [];
        const full = mine.length >= pool.choose;
        return (
          <section key={pool.key} className="talents-section">
            <div className="talents-head">
              <span className="race-section-label m-0">{pool.source}</span>
              <span className={`builder-asi-count ${full ? '' : 'is-pending'}`}>
                {full ? 'Done ✓' : `Choose ${pool.choose - mine.length} more`}
              </span>
            </div>
            <p className="builder-path-hint mt-0 mb-2">
              {pool.note || (pool.from.length === DND_SKILLS.length ? `Any ${pool.choose === 1 ? 'skill' : `${pool.choose} skills`}.` : `Choose ${pool.choose} of these.`)}
            </p>
            <div className="builder-skills">
              {pool.from.map((skill) => {
                const picked = mine.includes(skill);
                const elsewhere = !picked ? owner(skill) : undefined;
                return (
                  <button
                    key={skill}
                    type="button"
                    className={`builder-skill ${picked ? 'is-picked' : ''}`}
                    onClick={() => onToggle(pool.key, skill)}
                    disabled={!picked && (full || !!elsewhere)}
                    aria-pressed={picked}
                    title={elsewhere ? `Already from ${elsewhere}` : undefined}
                  >
                    <span>
                      <span className="builder-skill-name">{skill}</span>
                      {elsewhere && <small className="talents-from">from {elsewhere}</small>}
                    </span>
                    {skillMod(skill)}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {pools.length === 0 && granted.length === 0 && (
        <p className="text-muted-theme">Choose a class and background first.</p>
      )}

      <LanguagesSection {...languages} />
    </div>
  );
};

const LanguagesSection = ({ known, pools, picks, onToggle }: Props['languages']) => {
  const owner = (lang: string) =>
    known.find((k) => k.language === lang)?.source ?? pools.find((p) => picks[p.key]?.includes(lang))?.source;

  return (
    <div className="talents-languages">
      <h3 className="talents-title">Languages</h3>
      <section className="talents-section">
        <div className="talents-head">
          <span className="race-section-label m-0">You speak</span>
        </div>
        <div className="lang-chips">
          {known.map((k) => (
            <span key={k.language} className="lang-chip is-known" title={`From ${k.source}`}>
              {k.language}<small>{k.source}</small>
            </span>
          ))}
          {known.length === 0 && <span className="text-muted-theme" style={{ fontSize: '0.85rem' }}>Choose a race to see your languages.</span>}
        </div>
      </section>

      {pools.map((pool) => {
        const mine = picks[pool.key] || [];
        const full = mine.length >= pool.choose;
        const group = (label: string, list: string[]) => (
          <div className="lang-group">
            <div className="lang-group-label">{label}</div>
            <div className="lang-chips">
              {list.map((lang) => {
                const picked = mine.includes(lang);
                const elsewhere = !picked ? owner(lang) : undefined;
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`lang-chip ${picked ? 'is-picked' : ''}`}
                    onClick={() => onToggle(pool.key, lang)}
                    disabled={!picked && (full || !!elsewhere)}
                    aria-pressed={picked}
                    title={elsewhere ? `Already from ${elsewhere}` : undefined}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>
        );
        return (
          <section key={pool.key} className="talents-section">
            <div className="talents-head">
              <span className="race-section-label m-0">{pool.source}</span>
              <span className={`builder-asi-count ${full ? '' : 'is-pending'}`}>
                {full ? 'Done ✓' : `Learn ${pool.choose - mine.length} more`}
              </span>
            </div>
            {group('Standard', STANDARD_LANGUAGES)}
            {group('Exotic', EXOTIC_LANGUAGES)}
          </section>
        );
      })}
    </div>
  );
};

export default TalentsStep;
