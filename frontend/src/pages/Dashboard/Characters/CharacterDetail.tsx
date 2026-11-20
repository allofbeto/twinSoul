import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { useAuth } from '../../../context/AuthContext';
import { useParams } from 'react-router-dom';
import { getCharacter, updateCharacter, createImageAsset, migrateInventory, getInventoryItems } from '../../../api/backendHelpers';
import CharacterTopBar from './Components/CharacterTopBar';
import AbilityScores from './Components/AbilityScores';
import CharacterArtBox from './Components/CharacterArtBox';
import TabbedPanel, { SheetTab } from './Components/TabbedPanel';
import SkillSelector from './Components/SkillSelector';
import LanguagesPanel from './Components/LanguagesPanel';
import InventoryTable from './Components/InventoryTable';
import TraitsPanel from './Components/sheet/TraitsPanel';
import ActionsPanel from './Components/sheet/ActionsPanel';
import FeatsPanel from './Components/sheet/FeatsPanel';
import ChoicesPanel from './Components/sheet/ChoicesPanel';
import { CharacterChoice, choiceActions, choiceSlots, openChoices } from './featureChoices';
import { SheetAction } from './actionTypes';
import { minedActionsFromText } from './actionMining';
import SpellsPanel from './Components/sheet/SpellsPanel';
import { CharacterSpell, castTiming, useSpells } from './spellTypes';
import { buildSpellSources, isReady } from './spellRules';
import VitalsPanel, { DerivedStat } from './Components/sheet/VitalsPanel';
import DetailsCard from './Components/sheet/DetailsCard';
import ResourcesPanel from './Components/sheet/ResourcesPanel';
import NotesPanel from './Components/sheet/NotesPanel';
import RestDialog, { RestKind } from './Components/sheet/RestDialog';
import { CharacterFeat } from './featTypes';
import LevelUpWizard from './Components/LevelUpWizard';
import MigrateInventory from '../../Items/MigrateItems';
import { ABILITY_INDEX_TO_KEY, CharacterClassSummary } from './classTypes';
import { useCharClasses } from './useCharClasses';
import { findCharRace, useCharRaces } from './useCharRaces';
import { useSheetEditor } from './useSheetEditor';
import { NarrowContext, useNarrow, useSheetSwipeDismiss } from './useNarrow';
import { DockAction, DockActionContext } from './dockAction';
import MobileVitalsBar from './Components/sheet/MobileVitalsBar';
import HomebrewStatusNotice, { HomebrewStatus } from './Components/HomebrewStatusNotice';
import {
  ABILITY_KEYS, ABILITY_SHORT, AbilityKey, AbilityScoreSet, CustomTracker, Overrides, abilityMod, applyDamage, applyHealing,
  hasJackOfAllTrades, hitDicePools, initiativeBonus, isSaveProficient, longRestChanges, overridden, pairClasses,
  restCustomTrackers, savingThrowProficiencies, setOverride, shortRestChanges, skillBonus, spellSlotLevels, trackedResources,
} from './sheetRules';
import { SaveRow } from './Components/AbilityScores';
import '../../../styles/characterSheet.css';

type CharRaceRef = { index: string; name: string; user_id: string | null; speed: number | null; icon?: string | null };

interface Character {
  id: string;
  background?: string | null;
  user_id: string;
  name: string;
  race: string;
  char_race?: CharRaceRef | null;
  subrace_index?: string | null;
  classes: string[];
  character_class_summaries: CharacterClassSummary[];
  proficiency_bonus: number;
  level: number;
  max_hp: number;
  current_hp: number;
  armor_class: number;
  temp_hp: number;
  temp_ac_bonus: number;
  game: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  skills: string[];
  expertise: string[];
  languages?: string[];
  profile_image_id: string | null;
  /** Client-side only: the portrait's link, kept with the id so undo restores both. */
  profile_image_url?: string;
  gold: number;
  inspo: number;
  notes: string | null;
  speed: number | null;
  death_save_successes: number;
  death_save_failures: number;
  hit_dice_used: Record<string, number>;
  spell_slots_used: Record<string, number>;
  resources_used: Record<string, number>;
  /** The table's own numbers, replacing what the sheet works out. */
  overrides: Overrides;
  custom_trackers: CustomTracker[];
  actions: SheetAction[];
  spells: CharacterSpell[];
  /** Fighting styles, invocations, metamagic and other picks from a class menu. */
  feature_choices: CharacterChoice[];
  campaign_id: string | null;
  campaign?: { id: string; name: string; user_id?: string };
  homebrew_status?: HomebrewStatus;
  homebrew_review_note?: string | null;
  homebrew_summary?: { kind: 'race' | 'class'; index: string; name: string; source_url: string | null }[];
  feats?: CharacterFeat[];
}

type Key = keyof Character;
const RACE_KEYS: Key[] = ['race', 'char_race', 'subrace_index'];
// Never sent: client-only, or owned by other endpoints.
const LOCAL_KEYS = new Set<Key>(['profile_image_url']);

/** The request body for the fields that changed. */
const toPayload = (keys: Key[], f: Character) => {
  const out: Record<string, unknown> = {};
  keys.forEach((k) => {
    if (RACE_KEYS.includes(k)) {
      out.race = f.race;
      out.char_race_index = f.char_race?.index ?? '';
      out.subrace_index = f.subrace_index ?? '';
    } else if (!LOCAL_KEYS.has(k)) {
      out[k] = f[k];
    }
  });
  return out;
};

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

interface CharacterDetailProps {
  /** Overrides the route param — lets this be embedded outside its usual
   * /characters/:id route (e.g. inline in the Theatre for a player). */
  characterId?: string;
}

const CharacterDetail = ({ characterId }: CharacterDetailProps = {}) => {
  const params = useParams();
  const id = characterId ?? params.id;
  const { user } = useAuth();
  const { classes: classCatalog } = useCharClasses();
  const { races: raceCatalog } = useCharRaces();
  const { spells: spellCatalog } = useSpells();

  const [sheetRef, narrow] = useNarrow();
  const [dockAction, setDockAction] = useState<DockAction | null>(null);
  useSheetSwipeDismiss(narrow);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [rest, setRest] = useState<RestKind | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState<string | null>(null);
  const [showMigrate, setShowMigrate] = useState(false);
  const messageTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string) => {
    window.clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = window.setTimeout(() => setMessage(''), 3000);
  }, []);
  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  const editor = useSheetEditor<Character>({
    // Saves go to the character that changed, even if the Theatre has
    // since switched this sheet to someone else.
    save: async (keys, current) => {
      setError('');
      try {
        const res = await updateCharacter(current.id, toPayload(keys, current));
        return res.data;
      } catch (err: any) {
        setError(err.response?.data?.errors?.join(', ') || '');
        throw err;
      }
    },
    // The server has the final word on what it works out itself.
    merge: (prev, saved, stillPending) => {
      if (prev.id !== saved.id) return prev;
      const raceSettled = !RACE_KEYS.some((k) => stillPending.has(k));
      return {
        ...prev,
        level: saved.level ?? prev.level,
        proficiency_bonus: saved.proficiency_bonus ?? prev.proficiency_bonus,
        homebrew_status: saved.homebrew_status,
        homebrew_review_note: saved.homebrew_review_note,
        ...(raceSettled ? { char_race: saved.char_race ?? null, subrace_index: saved.subrace_index ?? null } : {}),
      };
    },
  });
  const { form, setForm, edit, flush, clearHistory } = editor;

  // ── Loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      await flush(); // anything still pending for the previous character
      try {
        const res = await getCharacter(id!);
        if (!alive) return;
        setForm({ ...res.data, profile_image_url: res.data.profile_image?.url || '' });
        clearHistory();
      } catch {
        if (alive) setError('Could not load character.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, flush, setForm, clearHistory]);

  // Ctrl/Cmd+Z undoes sheet edits, except while typing (the field's own undo wins).
  const shortcuts = useRef({ undo: () => {}, redo: () => {} });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || isTyping(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) shortcuts.current.redo(); else shortcuts.current.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const summaries = useMemo(() => form?.character_class_summaries || [], [form?.character_class_summaries]);
  const entries = useMemo(() => pairClasses(summaries, classCatalog), [summaries, classCatalog]);

  if (loading && !form) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">{error || 'Character not found.'}</p>;

  const isOwner = form.user_id === user?.id;
  const is5e = form.game === 'dnd_5e';
  const change = (patch: Partial<Character>, label: string, coalesceKey?: string) => {
    if (isOwner) edit(patch, label, { coalesceKey });
  };

  const undo = () => { if (editor.undoLabel) flash(`Undid ${editor.undoLabel}`); editor.undo(); };
  const redo = () => { if (editor.redoLabel) flash(`Redid ${editor.redoLabel}`); editor.redo(); };
  shortcuts.current = { undo, redo };

  // ── Things that go through other endpoints ─────────────────────────────
  const handleImageUrlChange = async (url: string) => {
    try {
      const res = await createImageAsset({ url });
      change({ profile_image_id: res.data.id, profile_image_url: url }, 'portrait');
    } catch {
      setError("Couldn't use that image link.");
    }
  };

  // Not undoable: moving campaigns can also move or clear the inventory.
  const setCampaign = (campaignId: string | null) =>
    edit({ campaign_id: campaignId }, 'campaign', { history: false, immediate: true });

  const handleCampaignChange = async (newCampaignId: string | null) => {
    try {
      const res = await getInventoryItems(form.id);
      if (res.data.length > 0 && newCampaignId) {
        setPendingCampaignId(newCampaignId);
        setShowMigrate(true);
        return;
      }
    } catch { /* fall through and just change it */ }
    setCampaign(newCampaignId);
  };

  const finishCampaignMove = async (mode: 'migrate' | 'clear') => {
    await migrateInventory(form.id, mode);
    setCampaign(pendingCampaignId);
    setShowMigrate(false);
    flash('Campaign updated');
  };

  // Class and level-up changes are saved by their own endpoints; earlier
  // undo steps could contradict them, so history starts fresh.
  const takeServerCharacter = (updated: Partial<Character>, fields?: Key[]) => {
    setForm((prev) => prev && { ...prev, ...(fields ? Object.fromEntries(fields.map((k) => [k, updated[k]])) : updated) });
    clearHistory();
  };

  const openLevelUp = async () => {
    await flush();
    setShowLevelUp(true);
  };

  // ── Derived numbers ────────────────────────────────────────────────────
  const feats = form.feats || [];
  const scores: AbilityScoreSet = {
    strength: form.strength, dexterity: form.dexterity, constitution: form.constitution,
    intelligence: form.intelligence, wisdom: form.wisdom, charisma: form.charisma,
  };
  const ov: Overrides = form.overrides || {};
  const customTrackers = form.custom_trackers || [];
  // Hand-set values go through `overrides`; null puts the calculation back.
  const setOv = (key: string, value: number | null, label: string, auto?: number) =>
    change({ overrides: setOverride(ov, key, value, auto) }, label);

  const autoPb = form.proficiency_bonus ?? (Math.ceil(form.level / 4) + 1);
  const pb = overridden(ov, 'proficiency_bonus', autoPb);
  const skills = form.skills || [];
  const expertise = form.expertise || [];
  const jack = hasJackOfAllTrades(entries);
  const autoSaves = savingThrowProficiencies(entries, feats);
  const saveRows: SaveRow[] = ABILITY_KEYS.map((key) => {
    const proficient = isSaveProficient(key, autoSaves, ov);
    return {
      key,
      proficient,
      autoProficient: autoSaves.has(key),
      auto: abilityMod(scores[key]) + (proficient ? pb : 0),
      value: ov[`save:${key}`],
    };
  });
  const pools = hitDicePools(entries, form.hit_dice_used || {}, ov);
  const slots = spellSlotLevels(entries, form.spell_slots_used || {}, ov);
  const resources = trackedResources(entries, scores, form.resources_used || {}, ov);
  const raceSpeed = form.char_race?.speed ?? null;
  const perception = overridden(ov, 'skill:Perception', skillBonus('Perception', scores, skills, expertise, pb, jack));

  const vitalStats: DerivedStat[] = [
    { key: 'initiative', label: 'Initiative', auto: initiativeBonus(scores, feats, pb, jack), value: ov.initiative, signed: true },
    { key: 'speed', label: 'Speed', auto: raceSpeed ?? 30, value: form.speed ?? undefined, suffix: 'ft' },
    { key: 'proficiency_bonus', label: 'Proficiency', auto: autoPb, value: ov.proficiency_bonus, signed: true },
    { key: 'passive:Perception', label: 'Passive Perc.', auto: 10 + perception, value: ov['passive:Perception'] },
  ];

  const classLine = summaries.length
    ? summaries.map((s) => `${s.char_class_name || s.custom_name} ${s.level}`).join(' / ')
    : (form.classes || []).join(', ');
  const subtitle = [form.race, classLine || `Level ${form.level}`, form.background].filter(Boolean).join(' · ');

  const playState = {
    current_hp: form.current_hp, max_hp: form.max_hp, temp_hp: form.temp_hp,
    death_save_successes: form.death_save_successes, death_save_failures: form.death_save_failures,
    hit_dice_used: form.hit_dice_used || {}, spell_slots_used: form.spell_slots_used || {}, resources_used: form.resources_used || {},
  };

  const finishRest = (kind: RestKind) => {
    change({
      ...(kind === 'short' ? shortRestChanges(playState, resources) : longRestChanges(playState, pools)),
      custom_trackers: restCustomTrackers(customTrackers, kind),
    }, `${kind} rest`);
    setRest(null);
    flash(kind === 'short' ? 'Short rest taken' : 'Long rest taken');
  };

  const spendHitDie = (die: string, healed: number) => {
    const used = form.hit_dice_used || {};
    change({ hit_dice_used: { ...used, [die]: (used[die] || 0) + 1 }, ...applyHealing(form, healed) }, `${die} hit die`);
  };

  // A feat that raises an ability brings its +1 with it, and takes it back
  // when removed, as one undo step.
  const featAbilityPatch = (code: string | undefined, delta: number): Partial<Character> => {
    const key = code ? (ABILITY_INDEX_TO_KEY[code] as AbilityKey | undefined) : undefined;
    return key ? { [key]: Math.max(1, Math.min(30, scores[key] + delta)) } : {};
  };
  const addFeat = (feat: CharacterFeat) =>
    change({ feats: [...feats, feat], ...featAbilityPatch(feat.ability, 1) }, `add ${feat.name}`);
  const removeFeat = (index: number) => {
    const feat = feats[index];
    change({ feats: feats.filter((_, i) => i !== index), ...featAbilityPatch(feat.ability, -1) }, `remove ${feat.name}`);
  };

  // Spells: every source the character has, and the ready ones for the Actions tab.
  const characterSpells = form.spells || [];
  // Class options: the menus the build opens up, and what's been picked from them.
  const featureChoices = form.feature_choices || [];
  const optionSlots = choiceSlots(entries, feats);
  const openOptions = openChoices(optionSlots, featureChoices);

  const spellSources = buildSpellSources({
    entries,
    raceIndex: form.char_race?.index,
    subraceIndex: form.subrace_index,
    feats,
    choices: featureChoices,
    level: form.level,
    scores,
    proficiencyBonus: pb,
    overrides: ov,
  });
  const linkedSpells: SheetAction[] = [
    ...spellSources.flatMap((src) => src.granted.map((g) => ({ name: g.name, index: g.index, level: undefined as number | undefined }))),
    ...characterSpells
      .filter((c) => isReady(spellSources.find((src) => src.key === c.source), c))
      .map((c) => ({ name: c.name, index: c.index, level: c.level as number | undefined, custom: c })),
  ].map((item: { name: string; index: string; level?: number; custom?: CharacterSpell }) => {
    const ref = spellCatalog.find((sp) => sp.index === item.index) || spellCatalog.find((sp) => sp.name.toLowerCase() === item.name.toLowerCase());
    const level = ref?.level ?? item.level ?? 0;
    return {
      id: `spell:${item.index}`,
      name: ref?.name || item.name,
      kind: 'spell' as const,
      cast_time: castTiming(ref?.casting_time || item.custom?.casting_time),
      spell_level: level,
      school: ref?.school || item.custom?.school || undefined,
      range: ref?.range || item.custom?.range,
      notes: ref ? [ref.duration, ref.concentration ? 'concentration' : ''].filter(Boolean).join(' · ') : item.custom?.notes,
      description: ref ? [...ref.desc, ...ref.higher_level.map((d) => `At higher levels. ${d}`)].join('\n\n') : undefined,
      source: 'spell' as const,
    };
  }).filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i);

  const castSpell = (slotKey: string, spell: string) => {
    change({ spell_slots_used: { ...(form.spell_slots_used || {}), [slotKey]: ((form.spell_slots_used || {})[slotKey] || 0) + 1 } }, `cast ${spell}`);
    flash(`Cast ${spell}`);
  };

  const tabs: SheetTab[] = [
    ...(is5e ? [{
      key: 'actions',
      label: 'Actions',
      content: (
        <ActionsPanel
          actions={form.actions || []}
          linkedSpells={[
            ...choiceActions(featureChoices),
            ...linkedSpells,
            ...feats.flatMap((f) => minedActionsFromText(f.desc, f.name, 'feat')),
          ]}
          slots={slots}
          isOwner={isOwner}
          onChange={(actions, label) => change({ actions }, label)}
          onCast={castSpell}
        />
      ),
    }, {
      key: 'spells',
      label: 'Spells',
      content: (
        <SpellsPanel
          characterId={form.id}
          campaignId={form.campaign_id}
          campaignName={form.campaign?.name}
          isDm={!!user && form.campaign?.user_id === user.id}
          sources={spellSources}
          spells={characterSpells}
          slots={slots}
          overrides={ov}
          isOwner={isOwner}
          onChange={(spells, label) => change({ spells }, label)}
          onCast={castSpell}
          onOverride={(key, v, label) => setOv(key, v, label)}
        />
      ),
    }, {
      key: 'resources',
      label: 'Resources',
      content: (
        <ResourcesPanel
          slots={slots}
          resources={resources}
          hitDice={pools}
          customTrackers={customTrackers}
          overrides={ov}
          isOwner={isOwner}
          onSlotUse={(key, n) => change({ spell_slots_used: { ...(form.spell_slots_used || {}), [key]: n } }, 'spell slot')}
          onResourceUse={(key, n) => change(
            { resources_used: { ...(form.resources_used || {}), [key]: n } },
            resources.find((r) => r.key === key)?.label || 'resource',
          )}
          onHitDiceUse={(die, n) => change({ hit_dice_used: { ...(form.hit_dice_used || {}), [die]: n } }, `${die} hit dice`)}
          onOverride={(key, v, label) => setOv(key, v, label)}
          onCustomChange={(custom_trackers, label) => change({ custom_trackers }, label)}
        />
      ),
    }, {
      key: 'feats',
      label: 'Feats',
      content: (
        <FeatsPanel
          feats={feats}
          isOwner={isOwner}
          onAdd={addFeat}
          onRemove={removeFeat}
          onUpdate={(index, feat) => change({ feats: feats.map((f, i) => (i === index ? feat : f)) }, feat.name)}
        />
      ),
    }, {
      key: 'features',
      label: openOptions > 0 ? `Features (${openOptions})` : 'Features',
      content: (
        <TraitsPanel
          raceName={form.race}
          raceIndex={form.char_race?.index ?? null}
          raceIconKey={form.char_race ? (form.char_race.icon || form.char_race.index) : null}
          subraceIndex={form.subrace_index ?? null}
          background={form.background}
          classSummaries={summaries}
          openOptions={openOptions}
          options={(
            <ChoicesPanel
              slots={optionSlots}
              choices={featureChoices}
              context={{
                classLevels: Object.fromEntries(entries.map((e) => [e.cls.index, e.summary.level])),
                taken: new Set(featureChoices.map((c) => c.index)),
                spells: new Set([
                  ...characterSpells.map((c) => c.index),
                  ...spellSources.flatMap((src) => src.granted.map((g) => g.index)),
                ]),
              }}
              isOwner={isOwner}
              onChange={(feature_choices, label) => change({ feature_choices }, label)}
            />
          )}
        />
      ),
    }] : []),
    { key: 'inventory', label: 'Inventory', content: <InventoryTable characterId={form.id} /> },
    {
      key: 'notes',
      label: 'Notes',
      content: <NotesPanel notes={form.notes || ''} isOwner={isOwner} onChange={(notes) => change({ notes }, 'notes', 'notes')} />,
    },
  ];

  const artBox = (
    <CharacterArtBox imageUrl={form.profile_image_url} name={form.name} onImageUrlChange={handleImageUrlChange} isOwner={isOwner} />
  );
  const vitals = (
    <VitalsPanel
      values={form}
      stats={vitalStats}
      onStatChange={(stat, v) => (stat.key === 'speed'
        ? change({ speed: v }, 'speed')
        : setOv(stat.key, v, stat.label.toLowerCase(), stat.auto))}
      hitDice={pools}
      isOwner={isOwner}
      onChange={(patch, label) => change(patch, label)}
      onDamage={(n) => change(applyDamage(form, n), `${n} damage`)}
      onHeal={(n) => change(applyHealing(form, n), `${n} healing`)}
      onShortRest={is5e ? () => setRest('short') : undefined}
      onLongRest={is5e ? () => setRest('long') : undefined}
      onLevelUp={is5e ? openLevelUp : undefined}
      canLevelUp={form.level < 20}
    />
  );
  const details = (
    <DetailsCard
      race={form.race}
      raceIndex={form.char_race?.index ?? null}
      raceIconKey={form.char_race ? (form.char_race.icon || form.char_race.index) : null}
      subraceIndex={form.subrace_index ?? null}
      background={form.background}
      level={form.level}
      gold={form.gold}
      characterId={form.id}
      classSummaries={summaries}
      legacyClasses={form.classes || []}
      is5e={is5e}
      isOwner={isOwner}
      scores={scores}
      onCharacterUpdated={(updated) => takeServerCharacter(updated, [
        'classes', 'character_class_summaries', 'level', 'proficiency_bonus', 'homebrew_summary', 'homebrew_status', 'homebrew_review_note',
      ])}
      onRaceChange={(choice) => {
        const race = findCharRace(raceCatalog, choice.char_race_index);
        change({
          race: choice.name,
          subrace_index: choice.subrace_index,
          char_race: {
            index: choice.char_race_index,
            name: race?.name || choice.name,
            user_id: race?.user_id ?? null,
            speed: race?.speed ?? null,
            icon: race?.icon ?? null,
          },
        }, 'race');
      }}
      onLevelChange={(level) => change({ level }, 'level')}
      onGoldChange={(gold) => change({ gold }, 'gold')}
      onBackgroundChange={(background) => change({ background }, 'background')}
    />
  );
  const abilities = (
    <AbilityScores
      scores={scores}
      saves={saveRows}
      onScoreChange={(key: AbilityKey, value) => change({ [key]: value }, ABILITY_SHORT[key])}
      onSaveProficiencyToggle={(key) => {
        const row = saveRows.find((r) => r.key === key)!;
        const next = !row.proficient;
        setOv(`saveprof:${key}`, next === row.autoProficient ? null : (next ? 1 : 0), `${ABILITY_SHORT[key]} save`);
      }}
      onSaveOverride={(key, v) => setOv(`save:${key}`, v, `${ABILITY_SHORT[key]} save`)}
      isOwner={isOwner}
      showSaves={is5e}
    />
  );
  const skillsCard = (
    <SkillSelector
      skills={skills}
      expertise={expertise}
      scores={scores}
      proficiencyBonus={pb}
      jackOfAllTrades={jack}
      onChange={(nextSkills, nextExpertise, skill) => change({ skills: nextSkills, expertise: nextExpertise }, skill)}
      overrides={ov}
      onOverride={(key, v, label) => setOv(key, v, label)}
      isOwner={isOwner}
    >
      {is5e && (
        <LanguagesPanel
          languages={form.languages || []}
          onChange={(languages) => change({ languages }, 'languages')}
          isOwner={isOwner}
        />
      )}
    </SkillSelector>
  );

  // Phones: Stats lead (avatar, abilities, skills, details), then the play tabs.
  const statsTab: SheetTab = {
    key: 'stats',
    label: 'Stats',
    content: (
      <div className="d-flex flex-column gap-3">
        <div className="sheet-statshero">
          <div className="sheet-statshero-avatar">{artBox}</div>
          <div className="sheet-statshero-text">
            <h3>{form.name}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
        {abilities}
        {skillsCard}
        {details}
      </div>
    ),
  };
  const mobileTabs = [statsTab, ...tabs];

  return (
    <NarrowContext.Provider value={narrow}>
    <DockActionContext.Provider value={setDockAction}>
    <div ref={sheetRef} className={`sheet ${isOwner ? 'sheet--editable' : ''} ${narrow ? 'sheet--mobile' : ''}`}>
      <CharacterTopBar
        name={form.name}
        onNameChange={(name) => change({ name }, 'name')}
        subtitle={subtitle}
        game={form.game}
        status={editor.status}
        message={message}
        error={error}
        onRetry={() => flush()}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        undoLabel={editor.undoLabel}
        redoLabel={editor.redoLabel}
        onUndo={undo}
        onRedo={redo}
        campaignId={form.campaign_id}
        onCampaignChange={handleCampaignChange}
        homebrewStatus={form.homebrew_status}
        isOwner={isOwner}
        dockAction={narrow ? dockAction : null}
        embedded={!!characterId}
      />

      <HomebrewStatusNotice
        status={form.homebrew_status}
        note={form.homebrew_review_note}
        homebrew={form.homebrew_summary || []}
        isOwner={isOwner}
        campaignName={form.campaign?.name}
        unsavedCampaignChange={false}
      />

      {narrow ? (
        <>
          <MobileVitalsBar
            currentHp={form.current_hp}
            maxHp={form.max_hp}
            tempHp={form.temp_hp}
            armorClass={form.armor_class + form.temp_ac_bonus}
            initiative={ov.initiative ?? vitalStats[0].auto}
            name={form.name}
            avatarUrl={form.profile_image_url}
            isOwner={isOwner}
            onDamage={(n) => change(applyDamage(form, n), `${n} damage`)}
            onHeal={(n) => change(applyHealing(form, n), `${n} healing`)}
          >
            {vitals}
          </MobileVitalsBar>
          <TabbedPanel tabs={mobileTabs} bottom />
        </>
      ) : (
        <div className="sheet-body">
          <div className="sheet-hero">
            {artBox}
            {vitals}
            {details}
          </div>

          <div className="sheet-main">
            {abilities}
            {skillsCard}
            <TabbedPanel tabs={tabs} />
          </div>
        </div>
      )}

      {is5e && (
        <LevelUpWizard
          isOpen={showLevelUp}
          characterId={form.id}
          currentLevel={form.level}
          classSummaries={summaries}
          feats={feats}
          abilityScores={scores}
          onCancel={() => setShowLevelUp(false)}
          onComplete={(updated: Character) => {
            takeServerCharacter(updated);
            setShowLevelUp(false);
            flash('Leveled up!');
          }}
        />
      )}

      <RestDialog
        kind={rest}
        onClose={() => setRest(null)}
        hitDice={pools}
        conMod={abilityMod(form.constitution)}
        currentHp={form.current_hp}
        maxHp={form.max_hp}
        slots={slots}
        resources={resources}
        onSpendHitDie={spendHitDie}
        onFinish={finishRest}
      />

      <Modal isOpen={showMigrate} toggle={() => setShowMigrate(false)} contentClassName="theme-modal">
        <ModalHeader toggle={() => setShowMigrate(false)}>Existing Inventory Detected</ModalHeader>
        <ModalBody>
          <MigrateInventory
            onMigrate={() => finishCampaignMove('migrate')}
            onClear={() => finishCampaignMove('clear')}
            onCancel={() => setShowMigrate(false)}
          />
        </ModalBody>
      </Modal>
    </div>
    </DockActionContext.Provider>
    </NarrowContext.Provider>
  );
};

export default CharacterDetail;
