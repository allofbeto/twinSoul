import React from 'react';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { ABILITY_INDEX_TO_KEY, CharacterClassSummary, classResources } from '../classTypes';
import { CharacterFeat, useFeats } from '../featTypes';
import ClassIcon, { classIconKey } from './ClassIcon';
import { TRACKED_COUNTER_KEYS } from '../sheetRules';

interface Props {
  classSummaries: CharacterClassSummary[];
  feats?: CharacterFeat[];
}

const ClassFeatures = ({ classSummaries, feats = [] }: Props) => {
  const { classes, loading } = useCharClasses();
  const { feats: catalog } = useFeats();

  const withData = classSummaries.filter((s) => s.char_class_index);

  if (loading) return <p className="text-muted-theme">Loading class data...</p>;

  if (withData.length === 0) {
    return <p className="text-muted-theme">Add a class under Details to see its proficiencies and features here.</p>;
  }

  return (
    <div className="d-flex flex-column gap-4">
      {withData.map((s) => {
        const cls = findCharClass(classes, s.char_class_index);
        if (!cls) return null;
        const subclass = cls.subclasses.find((sc) => sc.index === s.subclass_index);
        const featuresByLevel = cls.levels
          .filter((l) => l.level <= s.level)
          .map((l) => ({
            level: l.level,
            features: [
              ...l.features,
              ...(subclass?.levels.find((sl) => sl.level === l.level)?.features || []),
            ],
          }))
          .filter((l) => l.features.length > 0);

        return (
          <div key={s.id}>
            <h6 className="text-theme mb-1 d-flex align-items-center gap-2">
              <ClassIcon iconKey={classIconKey(cls)} size="1.4rem" />
              {cls.name} {s.level}{subclass ? ` — ${subclass.name}` : ''}
            </h6>
            <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>
              Hit Die d{cls.hit_die}
              {cls.saving_throws.length > 0 && (
                <> · Saving Throws: {cls.saving_throws.map((a) => (ABILITY_INDEX_TO_KEY[a] || a).slice(0, 3).toUpperCase()).join(', ')}</>
              )}
              {cls.spellcasting_ability && <> · Spellcasting: {(ABILITY_INDEX_TO_KEY[cls.spellcasting_ability] || cls.spellcasting_ability)}</>}
            </p>
            {cls.proficiencies.length > 0 && (
              <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>
                Proficiencies: {cls.proficiencies.filter((p) => !p.startsWith('Saving Throw')).join(', ')}
              </p>
            )}

            {classResources(cls, s.level, TRACKED_COUNTER_KEYS).length > 0 && (
              <div className="d-flex flex-wrap gap-2 mb-2">
                {classResources(cls, s.level, TRACKED_COUNTER_KEYS).map((r) => (
                  <span key={r.label} className="badge-cls">{r.label}: {r.value}</span>
                ))}
              </div>
            )}

            {subclass?.desc[0] && (
              <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                {subclass.desc[0]}
              </p>
            )}

            <div className="d-flex flex-column gap-1">
              {featuresByLevel.map(({ level, features }) => (
                <div key={level}>
                  {features.map((f) => (
                    <details key={f.index} style={{ fontSize: '0.82rem' }}>
                      <summary className="text-theme" style={{ cursor: 'pointer' }}>
                        <span className="text-muted-theme">Lvl {level}</span> {f.name}
                      </summary>
                      {f.desc.map((d, i) => (
                        <p key={i} className="text-muted-theme" style={{ fontSize: '0.78rem', marginLeft: '0.5rem' }}>{d}</p>
                      ))}
                    </details>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {feats.length > 0 && (
        <div>
          <h6 className="text-theme mb-2">Feats</h6>
          <div className="d-flex flex-column gap-1">
            {feats.map((ft, i) => {
              const info = catalog.find((c) => c.index === ft.index);
              return (
                <details key={`${ft.index}-${i}`} style={{ fontSize: '0.82rem' }}>
                  <summary className="text-theme" style={{ cursor: 'pointer' }}>
                    {ft.taken_at && <span className="text-muted-theme">{ft.taken_at}</span>} {ft.name}
                    {ft.ability && <span className="text-muted-theme"> (+1 {ft.ability.toUpperCase()})</span>}
                  </summary>
                  {info?.desc.map((d, n) => (
                    <p key={n} className="text-muted-theme" style={{ fontSize: '0.78rem', marginLeft: '0.5rem' }}>{d}</p>
                  ))}
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassFeatures;
