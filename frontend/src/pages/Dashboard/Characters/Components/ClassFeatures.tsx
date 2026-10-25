import React from 'react';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { ABILITY_INDEX_TO_KEY, CharacterClassSummary, spellSlotsAt } from '../classTypes';

interface Props {
  classSummaries: CharacterClassSummary[];
}

const SLOT_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ClassFeatures = ({ classSummaries }: Props) => {
  const { classes, loading } = useCharClasses();

  const withData = classSummaries.filter((s) => s.char_class_index);

  if (loading) return <p className="text-muted-theme">Loading class data...</p>;

  if (withData.length === 0) {
    return <p className="text-muted-theme">Assign a real class in the sidebar to see proficiencies, spell slots, and class features here.</p>;
  }

  return (
    <div className="d-flex flex-column gap-4">
      {withData.map((s) => {
        const cls = findCharClass(classes, s.char_class_index);
        if (!cls) return null;
        const subclass = cls.subclasses.find((sc) => sc.index === s.subclass_index);
        const slots = spellSlotsAt(cls, s.level);
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
            <h6 className="text-theme mb-1">
              {cls.name} {s.level}{subclass ? ` — ${subclass.name}` : ''}
            </h6>
            <p className="text-muted-theme mb-2" style={{ fontSize: '0.8rem' }}>
              Hit Die d{cls.hit_die}
              {cls.saving_throws.length > 0 && (
                <> · Saving Throws: {cls.saving_throws.map((a) => (ABILITY_INDEX_TO_KEY[a] || a).slice(0, 3).toUpperCase()).join(', ')}</>
              )}
              {cls.spellcasting_ability && <> · Spellcasting: {(ABILITY_INDEX_TO_KEY[cls.spellcasting_ability] || cls.spellcasting_ability)}</>}
            </p>

            {slots && (
              <div className="d-flex flex-wrap gap-2 mb-2">
                {typeof slots.cantrips_known === 'number' && slots.cantrips_known > 0 && (
                  <span className="badge-cls">Cantrips: {slots.cantrips_known}</span>
                )}
                {SLOT_LABELS.map((lvl) => {
                  const val = slots[`spell_slots_level_${lvl}`];
                  if (!val) return null;
                  return <span key={lvl} className="badge-cls">Lvl {lvl} slots: {val}</span>;
                })}
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
    </div>
  );
};

export default ClassFeatures;
