import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCharacter, createImageAsset } from '../../../../api/backendHelpers';
import { useCharClasses, findCharClass } from '../useCharClasses';
import { useCharRaces, findCharRace } from '../useCharRaces';
import { getClassAuraHue, CharClass, asiLevelsUpTo, classResources, getFeaturesGainedAt, requiresSubclassChoiceAt } from '../classTypes';
import { raceIconKey, raceLabel as formatRaceLabel } from '../raceTypes';
import { toughHpBonus, useFeats } from '../featTypes';
import ClassIcon, { classIconKey } from '../Components/ClassIcon';
import RaceIconPicker from '../Components/RaceIconPicker';
import RaceIcon from '../Components/RaceIcon';
import CharacterAura from '../Components/CharacterAura';
import HomebrewModal from '../homebrew/HomebrewModal';
import { isSelectableBy } from '../referenceCache';
import { useAuth } from '../../../../context/AuthContext';
import AbilityStep, { RollResult, ScoreMethod } from './AbilityStep';
import AsiStep from './AsiStep';
import BackgroundStep from './BackgroundStep';
import TalentsStep from './TalentsStep';
import { findBackground } from './backgrounds';
import { buildLanguageSources, buildSkillSources, sanitizeLanguagePicks, sanitizePicks } from './skillSources';
import SpellChooser from '../Components/sheet/SpellChooser';
import { CharacterSpell, useSpells } from '../spellTypes';
import { buildSpellSources, choicesLeft, sourceUsage } from '../spellRules';
import '../../../../styles/characterSheet.css';
import {
  ABILITY_KEYS,
  ABILITY_META,
  AbilityKey,
  AsiChoice,
  ClassPick,
  Scores,
  abilityKeyFromShort,
  asiBonuses,
  asiIsComplete,
  blankAsi,
  classFlavor,
  combinedPrimary,
  modifier,
  multiclassHp,
  multiclassRequirement,
  raceBonusChoice,
  signed,
  suggestName,
  suggestedArray,
  totalLevel,
} from './builderData';
import '../../../../styles/characterCreation.css';
import '../../../../styles/homebrew.css';

type Step = 'origin' | 'calling' | 'might' | 'past' | 'talents' | 'magic' | 'legend';

const STEPS: { key: Step; label: string; title: string; prompt: string }[] = [
  { key: 'origin', label: 'Origin', title: 'Where do you come from?', prompt: 'Your people shape your body, senses and gifts.' },
  { key: 'calling', label: 'Calling', title: 'What is your calling?', prompt: 'Your class is how you face the dangers ahead.' },
  { key: 'might', label: 'Might', title: 'Where does your strength lie?', prompt: 'Six abilities define what you do best and where you struggle.' },
  { key: 'past', label: 'Past', title: 'What did you do before?', prompt: 'Your background is the life you led before adventure found you.' },
  { key: 'talents', label: 'Talents', title: 'What have you learned?', prompt: 'Skills and languages from your people, your past and every class you follow.' },
  { key: 'magic', label: 'Magic', title: 'What magic do you wield?', prompt: 'Spells from your class, your people and your feats. You can change them on the sheet any time.' },
  { key: 'legend', label: 'Legend', title: 'Who are you?', prompt: 'Every legend starts with a name.' },
];

interface Props {
  onBack: () => void;
}

const Dnd5eCharacterWizard = ({ onBack }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classes: allClasses, loading: classesLoading } = useCharClasses('dnd_5e');
  const charClasses = allClasses.filter((c) => isSelectableBy(c, user?.id));
  const { races: charRaces } = useCharRaces('dnd_5e');
  const { feats: featCatalog } = useFeats('dnd_5e');
  const { spells: spellCatalog, loading: spellsLoading } = useSpells('dnd_5e');
  const [builderSpells, setBuilderSpells] = useState<CharacterSpell[]>([]);

  const [step, setStepRaw] = useState<Step>('origin');
  const [visited, setVisited] = useState<Set<Step>>(() => new Set<Step>(['origin']));
  const setStep = (next: Step) => {
    setStepRaw(next);
    setVisited((v) => new Set(v).add(next));
  };
  const [error, setError] = useState('');
  const [forging, setForging] = useState(false);
  const [classEditor, setClassEditor] = useState<{ open: boolean; existing: CharClass | null }>({ open: false, existing: null });

  const [raceIndex, setRaceIndex] = useState('');
  const [subraceIndex, setSubraceIndex] = useState('');
  const [raceLabel, setRaceLabel] = useState('');
  // Chosen classes, starting class first, each with its own level.
  const [picks, setPicks] = useState<ClassPick[]>([]);
  const [method, setMethod] = useState<ScoreMethod>('custom');
  const [base, setBase] = useState<Scores>(() => suggestedArray(undefined));
  const [scoresArranged, setScoresArranged] = useState(false);
  const [rolls, setRolls] = useState<RollResult[] | null>(null);
  const [chosenBonuses, setChosenBonuses] = useState<(AbilityKey | null)[]>([]);
  const [backgroundIndex, setBackgroundIndex] = useState('');
  const [customBackground, setCustomBackground] = useState('');
  // Chosen skills per source (starting class, race, background, multiclass…).
  const [skillPicks, setSkillPicks] = useState<Record<string, string[]>>({});
  const [languagePicks, setLanguagePicks] = useState<Record<string, string[]>>({});
  // Choices for each Ability Score Improvement, keyed by "class-level".
  const [asiState, setAsiState] = useState<Record<string, AsiChoice>>({});
  const [name, setName] = useState('');
  // Optional portrait from a link; checked by actually loading it.
  const [portraitUrl, setPortraitUrl] = useState('');
  const [portraitStatus, setPortraitStatus] = useState<'empty' | 'loading' | 'ok' | 'error'>('empty');
  const portrait = portraitUrl.trim();
  const portraitLooksValid = /^https?:\/\/\S+$/i.test(portrait);
  useEffect(() => {
    if (!portrait) return setPortraitStatus('empty');
    if (!portraitLooksValid) return setPortraitStatus('error');
    setPortraitStatus('loading');
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setPortraitStatus('ok');
    img.onerror = () => alive && setPortraitStatus('error');
    img.src = portrait;
    return () => {
      alive = false;
    };
  }, [portrait, portraitLooksValid]);

  const race = findCharRace(charRaces, raceIndex || undefined);
  const subrace = race?.subraces.find((s) => s.index === subraceIndex);
  const chosen = picks
    .map((p) => ({ pick: p, cls: findCharClass(charClasses, p.index) }))
    .filter((c): c is { pick: ClassPick; cls: CharClass } => !!c.cls);
  const cls = chosen[0]?.cls; // starting class: saves, skills, first-level HP
  const classIndex = picks[0]?.index || '';
  const level = Math.max(1, totalLevel(picks));
  const levelsLeft = 20 - totalLevel(picks);
  const isMulticlass = chosen.length > 1;
  const primaryAbilities = combinedPrimary(chosen.map((c) => c.cls));
  const classSummary = chosen
    .map(({ pick, cls: c }) => {
      const sub = c.subclasses.find((s) => s.index === pick.subclassIndex);
      return `${c.name}${sub ? ` (${sub.name})` : ''} ${pick.level}`;
    })
    .join(' / ');
  const shortClassSummary = chosen.map(({ pick, cls: c }) => `${c.name} ${pick.level}`).join(' / ');

  const asiChoices: AsiChoice[] = chosen.flatMap(({ pick, cls: c }) =>
    asiLevelsUpTo(c, pick.level).map((lvl) => asiState[`${c.index}-${lvl}`] || blankAsi(c.index, c.name, lvl)),
  );
  const setAsiChoices = (next: AsiChoice[]) =>
    setAsiState((current) => ({ ...current, ...Object.fromEntries(next.map((a) => [a.key, a])) }));
  const takenFeats = asiChoices
    .filter((a) => a.kind === 'feat' && a.featIndex)
    .map((a) => {
      const feat = featCatalog.find((f) => f.index === a.featIndex);
      return {
        index: a.featIndex as string,
        name: feat?.name || (a.featIndex as string),
        ability: a.featAbility ? ABILITY_META[a.featAbility].short.toLowerCase() : undefined,
        taken_at: `${a.className} ${a.classLevel}`,
      };
    });
  const subclassMissing = chosen.filter(({ pick, cls: c }) => requiresSubclassChoiceAt(c, pick.level) && !pick.subclassIndex);

  const addClass = (index: string) =>
    setPicks((current) =>
      current.some((p) => p.index === index) || totalLevel(current) >= 20
        ? current
        : [...current, { index, level: 1, subclassIndex: '' }],
    );
  const updatePick = (index: string, patch: Partial<ClassPick>) =>
    setPicks((current) => current.map((p) => (p.index === index ? { ...p, ...patch } : p)));
  const removePick = (index: string) => setPicks((current) => current.filter((p) => p.index !== index));
  const setPickLevel = (index: string, next: number) => {
    const pick = picks.find((p) => p.index === index);
    if (!pick) return;
    const capped = Math.max(1, Math.min(next, pick.level + levelsLeft));
    const c = findCharClass(charClasses, index);
    // Dropping below the subclass level clears the subclass.
    const keepSub = !!c?.subclass_choice_level && capped >= c.subclass_choice_level;
    updatePick(index, { level: capped, subclassIndex: keepSub ? pick.subclassIndex : '' });
  };

  const fixedBonuses = useMemo(() => {
    const out: Partial<Record<AbilityKey, number>> = {};
    [...(race?.ability_bonuses || []), ...(subrace?.ability_bonuses || [])].forEach((b) => {
      const key = abilityKeyFromShort(b.ability_score);
      if (key) out[key] = (out[key] || 0) + b.bonus;
    });
    return out;
  }, [race, subrace]);
  const bonusChoice = raceBonusChoice(race);

  const asiKey = JSON.stringify(asiChoices);
  const finalScores = useMemo(() => {
    const out = { ...base };
    const improvements = asiBonuses(JSON.parse(asiKey) as AsiChoice[]);
    ABILITY_KEYS.forEach((k) => {
      let score = base[k] + (fixedBonuses[k] || 0) + (improvements[k] || 0);
      bonusChoice?.amounts.forEach((amt, i) => { if (chosenBonuses[i] === k) score += amt; });
      out[k] = Math.max(1, Math.min(20, score));
    });
    return out;
  }, [base, fixedBonuses, bonusChoice, chosenBonuses, asiKey]);

  const hp =
    multiclassHp(chosen.map((c) => ({ cls: c.cls, level: c.pick.level })), modifier(finalScores.constitution)) +
    toughHpBonus(takenFeats, level);
  const ac = 10 + modifier(finalScores.dexterity);
  const background = findBackground(backgroundIndex);
  const backgroundName = background?.index === 'custom' ? customBackground.trim() || 'Custom' : background?.name;
  const { granted, pools } = buildSkillSources({ race, subrace, background, classes: chosen.map((c) => c.cls) });
  const picksBySource = sanitizePicks(skillPicks, granted, pools);
  const skills = [...granted.map((g) => g.skill), ...pools.flatMap((p) => picksBySource[p.key])];
  const skillsToChoose = pools.reduce((n, p) => n + p.choose, 0);
  const skillsChosen = pools.reduce((n, p) => n + picksBySource[p.key].length, 0);
  const langSources = buildLanguageSources({ race, subrace, background, classes: chosen.map((c) => c.cls) });
  const languagePicksBySource = sanitizeLanguagePicks(languagePicks, langSources.known, langSources.pools);
  const languages = [...langSources.known.map((k) => k.language), ...langSources.pools.flatMap((p) => languagePicksBySource[p.key])];
  const languagesToChoose = langSources.pools.reduce((n, p) => n + p.choose, 0);
  const languagesChosen = langSources.pools.reduce((n, p) => n + languagePicksBySource[p.key].length, 0);
  // Multiclassing needs the ability minimums of every class taken.
  const unmetRequirements = isMulticlass
    ? chosen
        .map(({ cls: c }) => ({ cls: c, req: multiclassRequirement(c) }))
        .filter(({ req }) => req && !req.met(finalScores))
        .map(({ cls: c, req }) => `${c.name} needs ${req!.label}`)
    : [];

  // Spells: the same sources the sheet uses, worked out from the choices so far.
  const spellSources = buildSpellSources({
    entries: chosen.map(({ pick, cls: c }) => ({
      cls: c,
      summary: { id: c.index, level: pick.level, subclass_index: pick.subclassIndex || null, char_class_index: c.index, char_class_name: c.name, custom_name: null },
    })),
    raceIndex: raceIndex || null,
    subraceIndex: subraceIndex || null,
    feats: takenFeats,
    level,
    scores: finalScores,
    proficiencyBonus: Math.ceil(level / 4) + 1,
  });
  const magicSources = spellSources.filter((src) =>
    src.key !== 'other' && (src.cantrips > 0 || src.spells > 0 || (src.prepares || 0) > 0 || src.granted.length > 0));
  const hasMagic = magicSources.length > 0;
  // Spells whose source went away (class removed, race changed) drop out.
  const keptSpells = builderSpells.filter((sp) => magicSources.some((src) => src.key === sp.source));
  const spellsLeft = magicSources.reduce((n, src) => n + choicesLeft(src, sourceUsage(src, keptSpells)), 0);
  const steps = STEPS.filter((st) => st.key !== 'magic' || hasMagic);

  // A new class re-lays the starting scores around its key abilities, unless
  // the player has already arranged the scores themselves.
  const primaryKey = primaryAbilities.join(',');
  useEffect(() => {
    if (method === 'custom' && !scoresArranged) setBase(suggestedArray(cls, undefined, primaryKey ? (primaryKey.split(',') as AbilityKey[]) : undefined));
  }, [cls, primaryKey, method, scoresArranged]);

  const stepIndex = Math.max(0, steps.findIndex((s) => s.key === step));
  const current = steps[stepIndex];

  const done: Record<Step, boolean> = {
    origin: !!race && (race.subraces.length === 0 || !!subrace),
    calling: !!cls && subclassMissing.length === 0,
    might: visited.has('might') && (method !== 'roll' || !!rolls) && asiChoices.every(asiIsComplete),
    past: !!background,
    talents: visited.has('talents') && skillsChosen === skillsToChoose && languagesChosen === languagesToChoose,
    magic: visited.has('magic') && spellsLeft === 0,
    legend: name.trim().length > 0,
  };
  const canAdvance = step === 'origin' ? done.origin : step === 'calling' ? done.calling : step === 'might' ? done.might : step === 'past' ? done.past : true;

  const goTo = (target: Step) => setStep(target);
  const goNext = () => canAdvance && steps[stepIndex + 1] && setStep(steps[stepIndex + 1].key);
  const goBack = () => (steps[stepIndex - 1] ? setStep(steps[stepIndex - 1].key) : onBack());

  const railValue = (key: Step) => {
    switch (key) {
      case 'origin': return raceLabel || '—';
      case 'calling': return shortClassSummary || '—';
      case 'might': return !visited.has('might') ? '—' : primaryAbilities.length ? primaryAbilities.slice(0, 2).map((k) => `${ABILITY_META[k].short} ${finalScores[k]}`).join(' · ') : 'Set';
      case 'past': return backgroundName || '—';
      case 'talents': return visited.has('talents') ? `${skills.length} skills` : '—';
      case 'magic': return visited.has('magic') ? `${keptSpells.length} spells` : '—';
      case 'legend': return name || '—';
      default: return '';
    }
  };

  const toggleSkill = (poolKey: string, skill: string) => {
    const pool = pools.find((p) => p.key === poolKey);
    if (!pool) return;
    const mine = picksBySource[poolKey] || [];
    const next = mine.includes(skill) ? mine.filter((s) => s !== skill) : mine.length < pool.choose ? [...mine, skill] : mine;
    setSkillPicks({ ...picksBySource, [poolKey]: next });
  };

  const toggleLanguage = (poolKey: string, language: string) => {
    const pool = langSources.pools.find((p) => p.key === poolKey);
    if (!pool) return;
    const mine = languagePicksBySource[poolKey] || [];
    const next = mine.includes(language) ? mine.filter((l) => l !== language) : mine.length < pool.choose ? [...mine, language] : mine;
    setLanguagePicks({ ...languagePicksBySource, [poolKey]: next });
  };

  const homebrewParts = [
    race?.homebrew ? `${race.name} (race)` : null,
    ...chosen.filter((c) => c.cls.homebrew).map((c) => `${c.cls.name} (class)`),
  ].filter(Boolean) as string[];

  const handleForge = async () => {
    if (!name.trim()) {
      setError('Give your hero a name first.');
      return;
    }
    if (portrait && portraitStatus !== 'ok') {
      setError(portraitStatus === 'loading' ? 'Still loading your portrait; try again in a moment.' : 'That portrait link doesn’t load an image. Fix it or clear it.');
      return;
    }
    setForging(true);
    setError('');
    try {
      const started = Date.now();
      const imageId = portrait ? (await createImageAsset({ url: portrait })).data?.id : undefined;
      const res = await createCharacter({
        profile_image_id: imageId,
        game: 'dnd_5e',
        name: name.trim(),
        race: raceLabel,
        level,
        max_hp: hp,
        current_hp: hp,
        armor_class: ac,
        ...finalScores,
        skills,
        languages,
        background: backgroundName,
        feats: takenFeats,
        spells: keptSpells,
        char_race_index: raceIndex || undefined,
        subrace_index: subraceIndex || undefined,
        classes: picks.map((p) => ({
          char_class_index: p.index,
          level: p.level,
          subclass_index: p.subclassIndex || undefined,
        })),
      });
      // Let the forge animation play for a beat before showing the sheet.
      const wait = Math.max(0, 1200 - (Date.now() - started));
      window.setTimeout(() => navigate(res.data?.id ? `/dashboard/characters/${res.data.id}` : '/dashboard/characters'), wait);
    } catch (err: any) {
      setForging(false);
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong. Your choices are still here; try again.');
    }
  };

  const hue = getClassAuraHue(classIndex || null);

  return (
    <div className={`builder ${forging ? 'is-forging' : ''}`} style={{ ['--builder-hue' as any]: hue }}>
      <div className="creation-layout">
        <nav className="creation-rail" aria-label="Character steps">
          {steps.map((s, i) => {
            const reachable = visited.has(s.key) || i <= stepIndex || steps.slice(0, i).every((p) => done[p.key] || p.key === 'talents' || p.key === 'magic');
            return (
              <button
                key={s.key}
                type="button"
                className={`creation-rail-step ${step === s.key ? 'active' : ''} ${done[s.key] ? 'completed' : ''}`}
                onClick={() => reachable && goTo(s.key)}
                disabled={!reachable}
                aria-current={step === s.key ? 'step' : undefined}
              >
                <span className="creation-rail-step-marker">{done[s.key] ? '✓' : i + 1}</span>
                <span>
                  <div className="creation-rail-step-label">{s.label}</div>
                  <div className="creation-rail-step-value">{railValue(s.key)}</div>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="builder-stage" aria-live="polite">
          <header className="builder-heading" key={step}>
            <div className="builder-eyebrow">Step {stepIndex + 1} of {steps.length} · {current.label}</div>
            <h2 className="builder-title">{current.title}</h2>
            <p className="builder-prompt">{current.prompt}</p>
          </header>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="builder-step" key={`body-${step}`}>
            {step === 'origin' && (
              <RaceIconPicker
                selectedRaceIndex={raceIndex || null}
                selectedSubraceIndex={subraceIndex || null}
                onSelect={({ raceIndex: idx, raceName, subraceIndex: subIdx, subraceName }) => {
                  if (idx !== raceIndex) setChosenBonuses([]);
                  setRaceIndex(idx);
                  setSubraceIndex(subIdx || '');
                  setRaceLabel(formatRaceLabel(raceName, subraceName));
                }}
              />
            )}

            {step === 'calling' && (
              <>
                {chosen.length > 0 && (
                  <div className="builder-path">
                    <div className="builder-path-head">
                      <span className="race-section-label m-0">Your path</span>
                      <span className="builder-path-total">
                        Level <strong>{level}</strong>
                        <small> / 20</small>
                      </span>
                    </div>
                    {chosen.map(({ pick, cls: c }, i) => {
                      const f = classFlavor(c);
                      const subLevel = c.subclass_choice_level;
                      const canSub = !!subLevel && pick.level >= subLevel && c.subclasses.length > 0;
                      const req = isMulticlass ? multiclassRequirement(c) : null;
                      return (
                        <div key={c.index} className="builder-path-row" style={{ ['--class-hue' as any]: getClassAuraHue(c.index) }}>
                          <div className="builder-path-main">
                            <span className="builder-class-icon"><ClassIcon iconKey={classIconKey(c)} fallback={f.icon} size="2.2rem" /></span>
                            <div className="builder-path-name">
                              <strong>{c.name}</strong>
                              <small>{i === 0 ? 'Starting class' : 'Multiclass'} · d{c.hit_die}</small>
                            </div>
                            <div className="builder-stepper" role="group" aria-label={`${c.name} level`}>
                              <button type="button" onClick={() => setPickLevel(c.index, pick.level - 1)} disabled={pick.level <= 1} aria-label={`Lower ${c.name} level`}>−</button>
                              <span aria-live="polite"><small>Lv</small>{pick.level}</span>
                              <button type="button" onClick={() => setPickLevel(c.index, pick.level + 1)} disabled={levelsLeft < 1} aria-label={`Raise ${c.name} level`}>+</button>
                            </div>
                            <button type="button" className="builder-path-remove" onClick={() => removePick(c.index)} aria-label={`Remove ${c.name}`}>✕</button>
                          </div>

                          {canSub && (
                            <div className="builder-path-sub">
                              <span>
                                {c.subclasses[0]?.subclass_flavor || 'Subclass'}
                                {!pick.subclassIndex && <span className="race-needs">required</span>}
                              </span>
                              <div className="builder-subclass-grid">
                                {c.subclasses.map((sc) => (
                                  <button
                                    key={sc.index}
                                    type="button"
                                    className={`builder-subclass ${pick.subclassIndex === sc.index ? 'is-selected' : ''}`}
                                    onClick={() => updatePick(c.index, { subclassIndex: pick.subclassIndex === sc.index ? '' : sc.index })}
                                    aria-pressed={pick.subclassIndex === sc.index}
                                  >
                                    <span className="builder-subclass-name">{sc.name}</span>
                                    {sc.desc[0] && <span className="builder-subclass-desc">{sc.desc[0].length > 90 ? `${sc.desc[0].slice(0, 90)}…` : sc.desc[0]}</span>}
                                    <span className="builder-subclass-source">{sc.source || 'SRD'}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {!canSub && subLevel ? (
                            <div className="builder-path-note">{c.subclasses[0]?.subclass_flavor || 'Subclass'} at level {subLevel}</div>
                          ) : null}
                          {(() => {
                            const gained = Array.from({ length: pick.level }, (_, n) => getFeaturesGainedAt(c, n + 1, pick.subclassIndex || null))
                              .flat()
                              .filter((feat) => !/^Ability Score Improvement/.test(feat.name));
                            const numbers = classResources(c, pick.level);
                            if (!gained.length && !numbers.length) return null;
                            return (
                              <details className="builder-path-features">
                                <summary>
                                  {gained.length} feature{gained.length === 1 ? '' : 's'} at level {pick.level}
                                  {numbers.slice(0, 2).map((n) => <span key={n.label} className="race-chip ms-2">{n.label} {n.value}</span>)}
                                </summary>
                                {numbers.length > 0 && (
                                  <div className="race-chips mb-2">
                                    {numbers.map((n) => <span key={n.label} className="race-chip">{n.label} <strong>{n.value}</strong></span>)}
                                  </div>
                                )}
                                <ul>
                                  {gained.map((feat, n) => (
                                    <li key={`${feat.index}-${n}`}><strong>{feat.name}</strong>{feat.desc[0] ? ` — ${feat.desc[0].length > 140 ? `${feat.desc[0].slice(0, 140)}…` : feat.desc[0]}` : ''}</li>
                                  ))}
                                </ul>
                              </details>
                            );
                          })()}
                          {req && <div className="builder-path-note">Multiclass needs {req.label}</div>}
                          {c.homebrew && (
                            <button type="button" className="race-change-link d-inline-block mt-1" onClick={() => setClassEditor({ open: true, existing: c })}>
                              Edit {c.name}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <p className="builder-path-hint">
                      {levelsLeft < 1
                        ? 'You have reached level 20.'
                        : chosen.length === 1
                          ? 'Want to multiclass? Tap another class below to add it.'
                          : 'Your first class gives your saving throws and starting skills.'}
                    </p>
                  </div>
                )}

                {classesLoading && <p className="text-muted-theme">Gathering the callings…</p>}
                <div className="builder-classes">
                  {charClasses.map((c) => {
                    const f = classFlavor(c);
                    const pick = picks.find((p) => p.index === c.index);
                    const unavailable = !pick && levelsLeft < 1;
                    return (
                      <button
                        key={c.index}
                        type="button"
                        className={`builder-class ${pick ? 'is-selected' : ''}`}
                        style={{ ['--class-hue' as any]: getClassAuraHue(c.index) }}
                        onClick={() => addClass(c.index)}
                        disabled={unavailable}
                        aria-pressed={!!pick}
                      >
                        <span className="builder-class-icon"><ClassIcon iconKey={classIconKey(c)} fallback={f.icon} size="2.1rem" /></span>
                        {pick && <span className="builder-class-badge">Lv {pick.level}</span>}
                        {!pick && chosen.length > 0 && <span className="builder-class-badge is-add">+ Add</span>}
                        <span className="builder-class-name">
                          {c.name}
                          {c.homebrew && <span className="homebrew-badge ms-2">Homebrew</span>}
                        </span>
                        <span className="builder-class-tagline">{f.tagline}</span>
                        <span className="builder-class-meta">
                          d{c.hit_die} · {f.primary.map((k) => ABILITY_META[k].short).join(' / ')}
                        </span>
                      </button>
                    );
                  })}
                  <button type="button" className="builder-class homebrew-add-tile" onClick={() => setClassEditor({ open: true, existing: null })}>
                    <span className="builder-class-icon" aria-hidden="true">＋</span>
                    <span className="builder-class-name">Homebrew class</span>
                    <span className="builder-class-tagline">Build your own, or import one from a link.</span>
                  </button>
                </div>

                <HomebrewModal
                  kind="class"
                  isOpen={classEditor.open}
                  existing={classEditor.existing}
                  onClose={() => setClassEditor({ open: false, existing: null })}
                  onSaved={(saved) => {
                    // A brand-new homebrew class joins the path; an edited one stays where it is.
                    if (!classEditor.existing) addClass(saved.index);
                    else if (saved.index !== classEditor.existing.index) {
                      setPicks((current) => current.map((p) => (p.index === classEditor.existing!.index ? { ...p, index: saved.index, subclassIndex: '' } : p)));
                    }
                  }}
                  onDeleted={(index) => removePick(index)}
                />
              </>
            )}

            {step === 'might' && (
              <AbilityStep
                method={method}
                onMethodChange={setMethod}
                base={base}
                onBaseChange={(next) => { setBase(next); setScoresArranged(true); }}
                rolls={rolls}
                onRollsChange={setRolls}
                cls={cls}
                primary={primaryAbilities}
                classLabel={chosen.map((c) => c.cls.name).join('/')}
                raceName={raceLabel}
                fixedBonuses={fixedBonuses}
                choice={bonusChoice}
                chosen={chosenBonuses}
                onChosenChange={setChosenBonuses}
                finalScores={finalScores}
              />
            )}
            {step === 'might' && (
              <AsiStep choices={asiChoices} onChange={setAsiChoices} feats={featCatalog} scores={finalScores} />
            )}

            {step === 'past' && (
              <BackgroundStep
                selected={background}
                onSelect={setBackgroundIndex}
                customName={customBackground}
                onCustomNameChange={setCustomBackground}
              />
            )}

            {step === 'talents' && (
              <TalentsStep
                granted={granted}
                pools={pools}
                picks={picksBySource}
                onToggle={toggleSkill}
                scores={finalScores}
                languages={{ known: langSources.known, pools: langSources.pools, picks: languagePicksBySource, onToggle: toggleLanguage }}
              />
            )}

            {step === 'magic' && (
              <div className="builder-magic">
                {magicSources.map((src) => (
                  <section key={src.key} className="sheet-spell-source">
                    <header className="sheet-spell-source-head">
                      <div className="sheet-spell-source-title"><strong>{src.label}</strong></div>
                    </header>
                    {src.mode === 'prepared' && (
                      <p className="sheet-form-hint mb-2">
                        You prepare spells from the whole {src.label.split(' · ')[0]} list each day. Pick your cantrips now, and prepare spells now or on the sheet.
                      </p>
                    )}
                    <SpellChooser
                      source={src}
                      chosen={keptSpells}
                      catalog={spellCatalog}
                      loading={spellsLoading}
                      onChange={(next) => setBuilderSpells(next)}
                    />
                  </section>
                ))}
              </div>
            )}

            {step === 'legend' && (
              <div className="builder-legend">
                <div className="builder-name-row">
                  <input
                    type="text"
                    className="form-control input-theme builder-name-input"
                    placeholder="Name your hero"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForge()}
                    maxLength={80}
                    autoFocus
                    aria-label="Character name"
                  />
                  <button type="button" className="btn btn-outline-secondary text-nowrap" onClick={() => setName(suggestName(raceIndex))} title="Suggest a name">
                    🎲 <span className="d-none d-sm-inline">Inspire me</span>
                  </button>
                </div>

                <div className="builder-portrait-field">
                  <label htmlFor="portrait-url" className="race-section-label">Portrait <span className="text-muted-theme">(optional)</span></label>
                  <div className="builder-portrait-row">
                    <span className={`builder-portrait-thumb is-${portraitStatus}`} aria-hidden>
                      {portraitStatus === 'ok' ? <img src={portrait} alt="" /> : portraitStatus === 'loading' ? '…' : portraitStatus === 'error' ? '!' : '🖼'}
                    </span>
                    <input
                      id="portrait-url"
                      type="url"
                      inputMode="url"
                      className="form-control input-theme"
                      placeholder="Paste an image link (https://…)"
                      value={portraitUrl}
                      onChange={(e) => setPortraitUrl(e.target.value)}
                      aria-describedby="portrait-help"
                      aria-invalid={portraitStatus === 'error'}
                    />
                    {portraitUrl && (
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setPortraitUrl('')} aria-label="Clear portrait link">
                        Clear
                      </button>
                    )}
                  </div>
                  <small id="portrait-help" className={portraitStatus === 'error' ? 'builder-portrait-error' : 'text-muted-theme'}>
                    {portraitStatus === 'error'
                      ? portraitLooksValid ? 'That link didn’t load an image.' : 'Use a full link starting with https://'
                      : portraitStatus === 'ok' ? 'Looking good. You can change it later on the sheet.' : 'A link to a picture of your hero. You can add or change it later.'}
                  </small>
                </div>

                <div className="builder-hero-card">
                  <div className="builder-hero-line">
                    <span className="builder-hero-name">{name || 'Your hero'}</span>
                    <span className="builder-hero-sub">
                      Level {level} {raceLabel} · {classSummary}{backgroundName ? ` · ${backgroundName}` : ''}
                    </span>
                  </div>
                  <div className="builder-hero-vitals">
                    <span><small>HP</small>{hp}</span>
                    <span><small>AC</small>{ac}</span>
                    <span><small>Hit dice</small>{chosen.length ? chosen.map((c) => `${c.pick.level}d${c.cls.hit_die}`).join(' + ') : 'd8'}</span>
                  </div>
                  <div className="builder-hero-scores">
                    {ABILITY_KEYS.map((k) => (
                      <span key={k} className={primaryAbilities.includes(k) ? 'is-primary' : ''}>
                        <small>{ABILITY_META[k].short}</small>{finalScores[k]}<em>{signed(modifier(finalScores[k]))}</em>
                      </span>
                    ))}
                  </div>
                  {skills.length > 0 && <div className="builder-hero-skills">Trained in {skills.join(', ')}</div>}
                  {languages.length > 0 && <div className="builder-hero-skills">Speaks {languages.join(', ')}</div>}
                  {takenFeats.length > 0 && <div className="builder-hero-skills">Feats: {takenFeats.map((ft) => ft.name).join(', ')}</div>}
                  {keptSpells.length > 0 && <div className="builder-hero-skills">Spells: {keptSpells.map((sp) => sp.name).join(', ')}</div>}
                  <p className="text-muted-theme mb-0 mt-2" style={{ fontSize: '0.75rem' }}>
                    HP and AC are worked out from your class, Constitution and Dexterity (no armour). You can change anything on the character sheet.
                  </p>
                </div>

                {unmetRequirements.length > 0 && (
                  <div className="homebrew-notice homebrew-notice--pending mt-3">
                    Multiclass check: {unmetRequirements.join('; ')} (13 in that score). Your DM may still allow it.
                  </div>
                )}

                {homebrewParts.length > 0 && (
                  <div className="homebrew-notice homebrew-notice--info mt-3">
                    Uses homebrew: {homebrewParts.join(', ')}. When this character joins a campaign, the DM approves the homebrew before they can play.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="builder-nav">
            <button type="button" className="btn btn-outline-secondary" onClick={goBack} disabled={forging}>
              Back
            </button>
            {step !== 'legend' ? (
              <button type="button" className="btn btn-theme-primary" onClick={goNext} disabled={!canAdvance}>
                {step === 'origin' && !race ? 'Choose a race' : step === 'origin' && !done.origin ? 'Choose a lineage' : step === 'calling' && !cls ? 'Choose a class' : step === 'calling' && subclassMissing.length ? `Choose a ${subclassMissing[0].cls.subclasses[0]?.subclass_flavor || 'subclass'}` : step === 'might' && !asiChoices.every(asiIsComplete) ? 'Choose improvements' : step === 'past' && !background ? 'Choose a background' : step === 'talents' && skillsChosen + languagesChosen < skillsToChoose + languagesToChoose ? `Continue (${skillsToChoose + languagesToChoose - skillsChosen - languagesChosen} unchosen)` : step === 'magic' && spellsLeft > 0 ? `Continue (${spellsLeft} unchosen)` : 'Continue'}
              </button>
            ) : (
              <button type="button" className="btn btn-theme-primary builder-forge" onClick={handleForge} disabled={forging || !name.trim()}>
                {forging ? 'Forging…' : `Forge ${name.trim() || 'your hero'}`}
              </button>
            )}
          </div>
        </section>

        <aside className="creation-preview card-theme p-3" aria-label="Character preview">
          <div className="builder-portrait">
            <CharacterAura hue={hue} />
            {portraitStatus === 'ok' ? (
              <span className="builder-portrait-icon">
                <img className="builder-portrait-img" src={portrait} alt={`${name || 'Your hero'} portrait`} />
              </span>
            ) : raceIndex && (
              <span className="builder-portrait-icon">
                <RaceIcon index={raceIconKey(race) || raceIndex} size="4.5rem" />
              </span>
            )}
          </div>
          <h5 className="text-theme text-center mt-3 mb-0">{name || 'Your hero'}</h5>
          <p className="text-muted-theme text-center mb-0" style={{ fontSize: '0.8rem' }}>
            {[raceLabel, shortClassSummary || null].filter(Boolean).join(' · ') || 'Choose an origin to begin'}
          </p>

          <div className="creation-preview-stats">
            {ABILITY_KEYS.map((k) => (
              <div className={`creation-preview-stat ${primaryAbilities.includes(k) ? 'is-primary' : ''}`} key={k}>
                <div className="creation-preview-stat-label">{ABILITY_META[k].short}</div>
                <div className="creation-preview-stat-value">{finalScores[k]}</div>
                <div className="creation-preview-stat-label">{signed(modifier(finalScores[k]))}</div>
              </div>
            ))}
          </div>

          <hr className="sidebar-divider" />
          <p className="text-muted-theme mb-0 text-center" style={{ fontSize: '0.8rem' }}>
            HP {hp} · AC {ac} · Level {level}
          </p>
        </aside>
      </div>
    </div>
  );
};

export default Dnd5eCharacterWizard;
