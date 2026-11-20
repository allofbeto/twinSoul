import React, { useState } from 'react';
import SegmentedTabs from './SegmentedTabs';
import ClassFeatures from '../ClassFeatures';
import RaceIcon from '../RaceIcon';
import { CharacterClassSummary } from '../../classTypes';
import { findCharRace, useCharRaces } from '../../useCharRaces';
import { BACKGROUNDS } from '../../creation/backgrounds';

interface Props {
  raceName: string;
  raceIndex: string | null;
  raceIconKey: string | null;
  subraceIndex: string | null;
  background: string | null | undefined;
  classSummaries: CharacterClassSummary[];
  /** The class options picker (fighting styles, invocations...), and how many picks are still open. */
  options?: React.ReactNode;
  openOptions?: number;
}

const findBackgroundByName = (name: string | null | undefined) =>
  name ? BACKGROUNDS.find((b) => b.name.toLowerCase() === name.trim().toLowerCase()) : undefined;

// Everything the character is built from (class features, race traits,
// background), one tab at a time so nobody has to dig through the builder.
const TraitsPanel = ({ raceName, raceIndex, raceIconKey, subraceIndex, background, classSummaries, options, openOptions = 0 }: Props) => {
  // Open picks come first: they're the part of the build still waiting on the player.
  const [view, setView] = useState<'options' | 'classes' | 'race' | 'background'>(options && openOptions > 0 ? 'options' : 'classes');
  const { races } = useCharRaces();
  const race = findCharRace(races, raceIndex);
  const subrace = race?.subraces.find((s) => s.index === subraceIndex);
  const traits = [
    ...(race?.traits || []).filter((t) => t.index !== 'ability-score-increase'),
    ...(subrace?.racial_traits || []),
  ];
  const bg = findBackgroundByName(background);

  return (
    <div className="d-flex flex-column gap-3">
      <SegmentedTabs
        options={[
          { key: 'classes', label: 'Classes' },
          ...(options ? [{ key: 'options' as const, label: 'Options', count: openOptions || undefined }] : []),
          { key: 'race', label: raceName ? `Race · ${raceName}` : 'Race' },
          { key: 'background', label: background ? `Background · ${background}` : 'Background' },
        ]}
        value={view}
        onChange={setView}
        aria-label="Features by source"
      />
      {view === 'race' && (
        <div className="sheet-origin">
          <h4 className="sheet-section-title">Race</h4>
          <div className="sheet-origin-name">
            {raceIconKey && <RaceIcon index={raceIconKey} size="1.4rem" />}
            {raceName || '—'}
          </div>
          {race && (
            <p className="sheet-origin-meta">
              {race.size} · {race.speed} ft{race.languages.length ? ` · ${race.languages.join(', ')}` : ''}
            </p>
          )}
          {traits.map((t) => (
            <details key={t.index} className="sheet-origin-trait">
              <summary>{t.name}</summary>
              {t.desc.map((d, i) => <p key={i}>{d}</p>)}
            </details>
          ))}
          {!race && raceName && <p className="sheet-origin-meta">No linked race data. Use Change under Details to pick one.</p>}
        </div>
      )}

      {view === 'background' && (
        <div className="sheet-origin">
          <h4 className="sheet-section-title">Background</h4>
          <div className="sheet-origin-name">{background || '—'}</div>
          {bg ? (
            <>
              <p className="sheet-origin-meta">{bg.summary}</p>
              <details className="sheet-origin-trait" open>
                <summary>{bg.feature.name}</summary>
                <p>{bg.feature.desc}</p>
              </details>
              <dl className="sheet-origin-facts">
                {bg.skills.length > 0 && <><dt>Skills</dt><dd>{bg.skills.join(', ')}</dd></>}
                {bg.tools !== '—' && <><dt>Tools</dt><dd>{bg.tools}</dd></>}
                {bg.languages !== '—' && <><dt>Languages</dt><dd>{bg.languages}</dd></>}
                <dt>Equipment</dt><dd>{bg.equipment}</dd>
              </dl>
            </>
          ) : background ? (
            <p className="sheet-origin-meta">A custom background. Keep its details in Notes.</p>
          ) : (
            <p className="sheet-origin-meta">No background yet. Set one under Details.</p>
          )}
        </div>
      )}

      {view === 'options' && options}

      {view === 'classes' && <ClassFeatures classSummaries={classSummaries} feats={[]} />}
    </div>
  );
};

export default TraitsPanel;
