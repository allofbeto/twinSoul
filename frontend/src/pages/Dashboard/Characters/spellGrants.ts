// Which spells subclasses, races and feats hand out. Spell names only (game
// facts); names that aren't in the SRD list show up as name-only spells the
// player can fill in. Levels are the class level (subclasses) or character
// level (races) the spell arrives at.

import { AbilityKey } from './sheetRules';

type ByLevel = Record<number, string[]>;

export interface SubclassSpells {
  /** always: prepared for free. expanded: added to the class's options. */
  kind: 'always' | 'expanded';
  label: string;
  /** always: keyed by class level. expanded: keyed by spell level. */
  spells: ByLevel;
}

export const SUBCLASS_SPELLS: Record<string, SubclassSpells> = {
  // Cleric domains
  life: { kind: 'always', label: 'Life Domain', spells: { 1: ['Bless', 'Cure Wounds'], 3: ['Lesser Restoration', 'Spiritual Weapon'], 5: ['Beacon of Hope', 'Revivify'], 7: ['Death Ward', 'Guardian of Faith'], 9: ['Mass Cure Wounds', 'Raise Dead'] } },
  'knowledge-domain': { kind: 'always', label: 'Knowledge Domain', spells: { 1: ['Command', 'Identify'], 3: ['Augury', 'Suggestion'], 5: ['Nondetection', 'Speak with Dead'], 7: ['Arcane Eye', 'Confusion'], 9: ['Legend Lore', 'Scrying'] } },
  'light-domain': { kind: 'always', label: 'Light Domain', spells: { 1: ['Burning Hands', 'Faerie Fire'], 3: ['Flaming Sphere', 'Scorching Ray'], 5: ['Daylight', 'Fireball'], 7: ['Guardian of Faith', 'Wall of Fire'], 9: ['Flame Strike', 'Scrying'] } },
  'nature-domain': { kind: 'always', label: 'Nature Domain', spells: { 1: ['Animal Friendship', 'Speak with Animals'], 3: ['Barkskin', 'Spike Growth'], 5: ['Plant Growth', 'Wind Wall'], 7: ['Dominate Beast', 'Grasping Vine'], 9: ['Insect Plague', 'Tree Stride'] } },
  'tempest-domain': { kind: 'always', label: 'Tempest Domain', spells: { 1: ['Fog Cloud', 'Thunderwave'], 3: ['Gust of Wind', 'Shatter'], 5: ['Call Lightning', 'Sleet Storm'], 7: ['Control Water', 'Ice Storm'], 9: ['Destructive Wave', 'Insect Plague'] } },
  'trickery-domain': { kind: 'always', label: 'Trickery Domain', spells: { 1: ['Charm Person', 'Disguise Self'], 3: ['Mirror Image', 'Pass without Trace'], 5: ['Blink', 'Dispel Magic'], 7: ['Dimension Door', 'Polymorph'], 9: ['Dominate Person', 'Modify Memory'] } },
  'war-domain': { kind: 'always', label: 'War Domain', spells: { 1: ['Divine Favor', 'Shield of Faith'], 3: ['Magic Weapon', 'Spiritual Weapon'], 5: ["Crusader's Mantle", 'Spirit Guardians'], 7: ['Freedom of Movement', 'Stoneskin'], 9: ['Flame Strike', 'Hold Monster'] } },
  'death-domain': { kind: 'always', label: 'Death Domain', spells: { 1: ['False Life', 'Ray of Sickness'], 3: ['Blindness/Deafness', 'Ray of Enfeeblement'], 5: ['Animate Dead', 'Vampiric Touch'], 7: ['Blight', 'Death Ward'], 9: ['Antilife Shell', 'Cloudkill'] } },
  // Paladin oaths
  devotion: { kind: 'always', label: 'Oath of Devotion', spells: { 3: ['Protection from Evil and Good', 'Sanctuary'], 5: ['Lesser Restoration', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] } },
  'oath-of-the-ancients': { kind: 'always', label: 'Oath of the Ancients', spells: { 3: ['Ensnaring Strike', 'Speak with Animals'], 5: ['Moonbeam', 'Misty Step'], 9: ['Plant Growth', 'Protection from Energy'], 13: ['Ice Storm', 'Stoneskin'], 17: ['Commune with Nature', 'Tree Stride'] } },
  'oath-of-vengeance': { kind: 'always', label: 'Oath of Vengeance', spells: { 3: ['Bane', "Hunter's Mark"], 5: ['Hold Person', 'Misty Step'], 9: ['Haste', 'Protection from Energy'], 13: ['Banishment', 'Dimension Door'], 17: ['Hold Monster', 'Scrying'] } },
  // Warlock patrons: extra spells to choose from
  fiend: { kind: 'expanded', label: 'The Fiend', spells: { 1: ['Burning Hands', 'Command'], 2: ['Blindness/Deafness', 'Scorching Ray'], 3: ['Fireball', 'Stinking Cloud'], 4: ['Fire Shield', 'Wall of Fire'], 5: ['Flame Strike', 'Hallow'] } },
  'the-archfey': { kind: 'expanded', label: 'The Archfey', spells: { 1: ['Faerie Fire', 'Sleep'], 2: ['Calm Emotions', 'Phantasmal Force'], 3: ['Blink', 'Plant Growth'], 4: ['Dominate Beast', 'Greater Invisibility'], 5: ['Dominate Person', 'Seeming'] } },
  'the-great-old-one': { kind: 'expanded', label: 'The Great Old One', spells: { 1: ['Dissonant Whispers', 'Hideous Laughter'], 2: ['Detect Thoughts', 'Phantasmal Force'], 3: ['Clairvoyance', 'Sending'], 4: ['Dominate Beast', 'Black Tentacles'], 5: ['Dominate Person', 'Telekinesis'] } },
};

/** Subclasses that can also choose from another class's list. */
export const SUBCLASS_EXTRA_LISTS: Record<string, string[]> = {
  'divine-soul': ['cleric'],
};

/** Subclasses that make a non-caster a third caster, drawing from the wizard list. */
export const THIRD_CASTERS: Record<string, { label: string; ability: AbilityKey; hint: string }> = {
  'eldritch-knight': { label: 'Eldritch Knight', ability: 'intelligence', hint: 'Mostly abjuration and evocation spells; a few may come from any school.' },
  'arcane-trickster': { label: 'Arcane Trickster', ability: 'intelligence', hint: 'Mostly enchantment and illusion spells; Mage Hand is part of the deal.' },
};

// Third casters' spells known by class level (PHB tables).
export const THIRD_CASTER_KNOWN: Record<number, number> = {
  3: 3, 4: 4, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6, 10: 7, 11: 8, 12: 8, 13: 9, 14: 10, 15: 10, 16: 11, 17: 11, 18: 11, 19: 12, 20: 13,
};

export interface RaceSpells {
  label: string;
  ability: AbilityKey;
  /** Free spells by character level. */
  granted?: ByLevel;
  /** Cantrips the player picks from a class list. */
  pick?: { cantrips: number; list: string };
}

// Keyed by subrace index first, then race index.
export const RACE_SPELLS: Record<string, RaceSpells> = {
  tiefling: { label: 'Infernal Legacy', ability: 'charisma', granted: { 1: ['Thaumaturgy'], 3: ['Hellish Rebuke'], 5: ['Darkness'] } },
  'high-elf': { label: 'High Elf Cantrip', ability: 'intelligence', pick: { cantrips: 1, list: 'wizard' } },
  aasimar: { label: 'Light Bearer', ability: 'charisma', granted: { 1: ['Light'] } },
  firbolg: { label: 'Firbolg Magic', ability: 'wisdom', granted: { 1: ['Detect Magic', 'Disguise Self'] } },
  'air-genasi': { label: 'Mingle with the Wind', ability: 'constitution', granted: { 1: ['Levitate'] } },
  'earth-genasi': { label: 'Merge with Stone', ability: 'constitution', granted: { 1: ['Pass without Trace'] } },
  'fire-genasi': { label: 'Reach to the Blaze', ability: 'constitution', granted: { 1: ['Produce Flame'], 3: ['Burning Hands'] } },
  'water-genasi': { label: 'Call to the Wave', ability: 'constitution', granted: { 1: ['Shape Water'], 3: ['Create or Destroy Water'] } },
  githyanki: { label: 'Githyanki Psionics', ability: 'intelligence', granted: { 1: ['Mage Hand'], 3: ['Jump'], 5: ['Misty Step'] } },
  githzerai: { label: 'Githzerai Psionics', ability: 'wisdom', granted: { 1: ['Mage Hand'], 3: ['Shield'], 5: ['Detect Thoughts'] } },
  triton: { label: 'Control Air and Water', ability: 'charisma', granted: { 1: ['Fog Cloud'], 3: ['Gust of Wind'], 5: ['Wall of Water'] } },
  'yuan-ti-pureblood': { label: 'Innate Spellcasting', ability: 'charisma', granted: { 1: ['Poison Spray', 'Animal Friendship'], 3: ['Suggestion'] } },
  fairy: { label: 'Fairy Magic', ability: 'charisma', granted: { 1: ['Druidcraft'], 3: ['Faerie Fire'], 5: ['Enlarge/Reduce'] } },
};

const CASTER_LISTS = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'];

export interface FeatSpells {
  granted?: string[];
  cantrips?: number;
  spells?: number;
  /** Lists the picks can come from. */
  lists: string[];
  /** Leveled picks must be exactly this level. */
  spellLevel?: number;
  schools?: string[];
  ritualOnly?: boolean;
  attackOnly?: boolean;
  hint?: string;
}

export const FEAT_SPELLS: Record<string, FeatSpells> = {
  'magic-initiate': { cantrips: 2, spells: 1, spellLevel: 1, lists: CASTER_LISTS, hint: 'Two cantrips and one 1st-level spell, all from the same class.' },
  'artificer-initiate': { cantrips: 1, spells: 1, spellLevel: 1, lists: ['artificer'] },
  'fey-touched': { granted: ['Misty Step'], spells: 1, spellLevel: 1, schools: ['Divination', 'Enchantment'], lists: [] },
  'shadow-touched': { granted: ['Invisibility'], spells: 1, spellLevel: 1, schools: ['Illusion', 'Necromancy'], lists: [] },
  'ritual-caster': { spells: 2, spellLevel: 1, ritualOnly: true, lists: CASTER_LISTS, hint: 'Two 1st-level rituals from one class; you can copy more into your book later.' },
  'spell-sniper': { cantrips: 1, attackOnly: true, lists: CASTER_LISTS, hint: 'One cantrip that needs an attack roll.' },
  'drow-high-magic': { granted: ['Detect Magic', 'Levitate', 'Dispel Magic'], lists: [] },
  'wood-elf-magic': { cantrips: 1, granted: ['Longstrider', 'Pass without Trace'], lists: ['druid'] },
  telekinetic: { granted: ['Mage Hand'], lists: [] },
  telepathic: { granted: ['Detect Thoughts'], lists: [] },
  'fey-teleportation': { granted: ['Misty Step'], lists: [] },
};
