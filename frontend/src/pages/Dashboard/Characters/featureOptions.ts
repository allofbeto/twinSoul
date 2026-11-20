// The small things a class lets you pick from a menu: fighting styles,
// eldritch invocations, pact boons, metamagic, maneuvers and infusions.
// Names are game facts; every summary is in our own short words, so read the
// book for the exact wording.

export type OptionGroup = 'fighting-style' | 'invocation' | 'pact-boon' | 'metamagic' | 'maneuver' | 'infusion' | 'other';

/** When it's used on your turn. Passive options have none. */
export type OptionTiming = 'action' | 'bonus' | 'reaction' | 'special';

export interface FeatureOption {
  index: string;
  name: string;
  group: OptionGroup;
  summary: string;
  /** Shows under Actions when set. `special` = part of something else (an attack, a spell). */
  timing?: OptionTiming;
  /** What it costs to use, e.g. "2 sorcery points". */
  cost?: string;
  /** Level needed in the class the group belongs to (Warlock, Artificer). */
  minLevel?: number;
  /** Another option that must already be taken (a pact boon). */
  needs?: string;
  /** A spell or cantrip the character must know. */
  needsSpell?: string;
  /** Anything else it needs, shown as written. */
  prereq?: string;
  /** Spells it lets you cast (the summary says how often). */
  spells?: string[];
  /** Cantrips to choose, cast with this ability. */
  cantrips?: { count: number; lists: string[]; ability: 'wisdom' | 'charisma' };
  /** Fighting styles: the classes whose list normally has it. */
  classes?: string[];
}

export const OPTION_GROUPS: Record<OptionGroup, { label: string; plural: string; className?: string; classIndex?: string }> = {
  'fighting-style': { label: 'Fighting Style', plural: 'Fighting Styles' },
  invocation: { label: 'Eldritch Invocation', plural: 'Eldritch Invocations', className: 'Warlock', classIndex: 'warlock' },
  'pact-boon': { label: 'Pact Boon', plural: 'Pact Boons', className: 'Warlock', classIndex: 'warlock' },
  metamagic: { label: 'Metamagic', plural: 'Metamagic', className: 'Sorcerer', classIndex: 'sorcerer' },
  maneuver: { label: 'Maneuver', plural: 'Maneuvers', className: 'Fighter', classIndex: 'fighter' },
  infusion: { label: 'Infusion', plural: 'Infusions', className: 'Artificer', classIndex: 'artificer' },
  other: { label: 'Option', plural: 'Other options' },
};

type Row = Omit<FeatureOption, 'group' | 'index'> & { index?: string };

const slug = (name: string) => name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const group = (g: OptionGroup, rows: Row[]): FeatureOption[] =>
  rows.map((r) => ({ ...r, group: g, index: r.index || slug(r.name) }));

const FIGHTING_STYLES = group('fighting-style', [
  { name: 'Archery', classes: ['fighter', 'ranger'], summary: '+2 to attack rolls with ranged weapons.' },
  { name: 'Defense', classes: ['fighter', 'paladin', 'ranger'], summary: '+1 AC while you’re wearing armor.' },
  { name: 'Dueling', classes: ['fighter', 'paladin', 'ranger', 'bard'], summary: '+2 damage with a melee weapon held in one hand while you hold no other weapon.' },
  { name: 'Great Weapon Fighting', classes: ['fighter', 'paladin'], summary: 'Reroll 1s and 2s on damage dice for a melee weapon held in two hands; keep the new roll.' },
  { name: 'Protection', classes: ['fighter', 'paladin'], timing: 'reaction', summary: 'With a shield: give disadvantage to an attack you can see against someone else within 5 ft of you.' },
  { name: 'Two-Weapon Fighting', classes: ['fighter', 'ranger', 'bard'], summary: 'Add your ability modifier to the damage of your off-hand attack.' },
  { name: 'Blind Fighting', classes: ['fighter', 'paladin', 'ranger'], summary: 'Blindsight out to 10 ft.' },
  { name: 'Interception', classes: ['fighter', 'paladin'], timing: 'reaction', summary: 'With a shield or weapon in hand: when someone else within 5 ft of you is hit, reduce the damage by 1d10 + your proficiency bonus.' },
  { name: 'Superior Technique', classes: ['fighter'], summary: 'Learn one maneuver and gain one d6 superiority die, back on a short or long rest. Add the maneuver under Other options.' },
  { name: 'Thrown Weapon Fighting', classes: ['fighter', 'ranger'], summary: 'Draw a thrown weapon as part of the attack, and +2 damage when you hit with one at range.' },
  { name: 'Unarmed Fighting', classes: ['fighter'], summary: 'Unarmed strikes deal 1d6 + STR (1d8 with both hands free). A creature you’re grappling takes 1d4 at the start of your turn.' },
  { name: 'Blessed Warrior', classes: ['paladin'], cantrips: { count: 2, lists: ['cleric'], ability: 'charisma' }, summary: 'Learn two cleric cantrips, cast with Charisma. Pick them in the Spells tab.' },
  { name: 'Druidic Warrior', classes: ['ranger'], cantrips: { count: 2, lists: ['druid'], ability: 'wisdom' }, summary: 'Learn two druid cantrips, cast with Wisdom. Pick them in the Spells tab.' },
]);

const PACT_BOONS = group('pact-boon', [
  { name: 'Pact of the Blade', timing: 'action', summary: 'Conjure a pact weapon in your hand in any melee form. You’re proficient with it and it counts as magical. You can bond a magic weapon instead.' },
  { name: 'Pact of the Chain', spells: ['Find Familiar'], summary: 'You know Find Familiar and can cast it as a ritual, with extra forms to choose (imp, pseudodragon, quasit, sprite). Give up one of your attacks to let the familiar attack with its reaction.' },
  { name: 'Pact of the Tome', cantrips: { count: 3, lists: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard', 'artificer'], ability: 'charisma' }, summary: 'A Book of Shadows holding three cantrips from any class lists, cast at will as warlock spells. Pick them in the Spells tab.' },
  { name: 'Pact of the Talisman', summary: 'A talisman whose wearer adds 1d4 to a failed ability check. Uses equal your proficiency bonus, back on a long rest.' },
]);

const BLAST = 'Eldritch Blast';
const BLADE = 'pact-of-the-blade';
const CHAIN = 'pact-of-the-chain';
const TOME = 'pact-of-the-tome';
const TALISMAN = 'pact-of-the-talisman';
const CURSE = 'Hex, or a warlock feature that curses';
const ONCE = 'once per long rest, using a warlock slot';

const INVOCATIONS = group('invocation', [
  { name: 'Agonizing Blast', needsSpell: BLAST, summary: 'Add your Charisma modifier to Eldritch Blast damage on a hit.' },
  { name: 'Armor of Shadows', spells: ['Mage Armor'], summary: 'Cast Mage Armor on yourself at will, without a slot.' },
  { name: 'Ascendant Step', minLevel: 9, spells: ['Levitate'], summary: 'Cast Levitate on yourself at will, without a slot.' },
  { name: 'Aspect of the Moon', needs: TOME, summary: 'You no longer need sleep and can’t be put to sleep; a long rest can be spent on light activity.' },
  { name: 'Beast Speech', spells: ['Speak with Animals'], summary: 'Cast Speak with Animals at will, without a slot.' },
  { name: 'Beguiling Influence', summary: 'Proficiency in Deception and Persuasion. Mark them in Skills.' },
  { name: 'Bewitching Whispers', minLevel: 7, spells: ['Compulsion'], summary: `Cast Compulsion ${ONCE}.` },
  { name: 'Bond of the Talisman', minLevel: 12, needs: TALISMAN, timing: 'action', summary: 'Teleport to the talisman’s wearer, or let them teleport to you. Uses equal your proficiency bonus, back on a long rest.' },
  { name: 'Book of Ancient Secrets', needs: TOME, summary: 'Write two 1st-level rituals from any class into your book and cast them as rituals; add more rituals as you find them.' },
  { name: 'Chains of Carceri', minLevel: 15, needs: CHAIN, spells: ['Hold Monster'], summary: 'Cast Hold Monster at will on a celestial, fiend or elemental, once per creature until a long rest.' },
  { name: 'Cloak of Flies', minLevel: 5, timing: 'bonus', summary: 'A 5 ft aura of flies: advantage on Intimidation, disadvantage on other Charisma checks, and creatures starting their turn in it take poison damage equal to your Charisma modifier. Once per short or long rest.' },
  { name: 'Devil’s Sight', summary: 'See normally in darkness, magical or not, out to 120 ft.' },
  { name: 'Dreadful Word', minLevel: 7, spells: ['Confusion'], summary: `Cast Confusion ${ONCE}.` },
  { name: 'Eldritch Mind', summary: 'Advantage on Constitution saves to keep concentration.' },
  { name: 'Eldritch Sight', spells: ['Detect Magic'], summary: 'Cast Detect Magic at will, without a slot.' },
  { name: 'Eldritch Smite', minLevel: 5, needs: BLADE, timing: 'special', cost: '1 warlock slot', summary: 'Once per turn when your pact weapon hits: +1d8 force damage, plus 1d8 per slot level, and a Huge or smaller target falls prone.' },
  { name: 'Eldritch Spear', needsSpell: BLAST, summary: 'Eldritch Blast reaches 300 ft.' },
  { name: 'Eyes of the Rune Keeper', summary: 'You can read all writing.' },
  { name: 'Far Scribe', minLevel: 5, needs: TOME, spells: ['Sending'], summary: 'A page holds names (up to your proficiency bonus); cast Sending to any of them without a slot or components.' },
  { name: 'Fiendish Vigor', spells: ['False Life'], summary: 'Cast False Life on yourself at will as a 1st-level spell.' },
  { name: 'Gaze of Two Minds', timing: 'action', summary: 'Touch a willing humanoid and perceive through its senses until the end of your next turn; spend your action to keep it going.' },
  { name: 'Ghostly Gaze', minLevel: 7, timing: 'action', summary: 'See through solid objects out to 30 ft for 1 minute (concentration), with darkvision in that range. Once per short or long rest.' },
  { name: 'Gift of the Depths', minLevel: 5, spells: ['Water Breathing'], summary: 'Breathe underwater and swim at your walking speed. Cast Water Breathing once per long rest without a slot.' },
  { name: 'Gift of the Ever-Living Ones', needs: CHAIN, summary: 'While your familiar is within 100 ft, any dice you roll to regain hit points count as their maximum.' },
  { name: 'Gift of the Protectors', minLevel: 9, needs: TOME, summary: 'A page holds names (up to your proficiency bonus); the first of them to drop to 0 HP drops to 1 instead. Once per long rest.' },
  { name: 'Grasp of Hadar', needsSpell: BLAST, timing: 'special', summary: 'Once per turn when Eldritch Blast hits, pull the target up to 10 ft straight toward you.' },
  { name: 'Improved Pact Weapon', needs: BLADE, summary: 'Your pact weapon is a spellcasting focus, gets +1 to attack and damage unless already magical, and can be a bow or crossbow.' },
  { name: 'Investment of the Chain Master', needs: CHAIN, timing: 'bonus', summary: 'Your familiar gains a 40 ft flying or swimming speed, magical attacks and your spell save DC. Bonus action: command it to attack. Reaction: give it resistance to damage it takes.' },
  { name: 'Kiss of Mephistopheles', minLevel: 5, needsSpell: BLAST, timing: 'bonus', cost: '1 warlock slot', summary: 'After Eldritch Blast hits, cast Fireball centered on the target.' },
  { name: 'Lance of Lethargy', needsSpell: BLAST, timing: 'special', summary: 'Once per turn when Eldritch Blast hits, cut the target’s speed by 10 ft until the end of your next turn.' },
  { name: 'Lifedrinker', minLevel: 12, needs: BLADE, summary: 'Your pact weapon deals extra necrotic damage equal to your Charisma modifier (minimum 1).' },
  { name: 'Maddening Hex', minLevel: 5, prereq: CURSE, timing: 'bonus', summary: 'Deal psychic damage equal to your Charisma modifier to your cursed target and creatures you choose within 5 ft of it (target within 30 ft and in sight).' },
  { name: 'Mask of Many Faces', spells: ['Disguise Self'], summary: 'Cast Disguise Self at will, without a slot.' },
  { name: 'Master of Myriad Forms', minLevel: 15, spells: ['Alter Self'], summary: 'Cast Alter Self at will, without a slot.' },
  { name: 'Minions of Chaos', minLevel: 9, spells: ['Conjure Elemental'], summary: `Cast Conjure Elemental ${ONCE}.` },
  { name: 'Mire the Mind', minLevel: 5, spells: ['Slow'], summary: `Cast Slow ${ONCE}.` },
  { name: 'Misty Visions', spells: ['Silent Image'], summary: 'Cast Silent Image at will, without a slot or components.' },
  { name: 'One with Shadows', minLevel: 5, timing: 'action', summary: 'In dim light or darkness, turn invisible until you move or take an action or reaction.' },
  { name: 'Otherworldly Leap', minLevel: 9, spells: ['Jump'], summary: 'Cast Jump on yourself at will, without a slot.' },
  { name: 'Protection of the Talisman', minLevel: 7, needs: TALISMAN, summary: 'The talisman’s wearer adds 1d4 to a failed saving throw. Uses equal your proficiency bonus, back on a long rest.' },
  { name: 'Rebuke of the Talisman', needs: TALISMAN, timing: 'reaction', summary: 'When the talisman’s wearer is hit by an attacker within 30 ft of you: psychic damage equal to your proficiency bonus, and push the attacker 10 ft.' },
  { name: 'Relentless Hex', minLevel: 7, prereq: CURSE, timing: 'bonus', summary: 'Teleport up to 30 ft to a space within 5 ft of your cursed target that you can see.' },
  { name: 'Repelling Blast', needsSpell: BLAST, timing: 'special', summary: 'When Eldritch Blast hits, push the target up to 10 ft straight away from you.' },
  { name: 'Sculptor of Flesh', minLevel: 7, spells: ['Polymorph'], summary: `Cast Polymorph ${ONCE}.` },
  { name: 'Shroud of Shadow', minLevel: 15, spells: ['Invisibility'], summary: 'Cast Invisibility at will, without a slot.' },
  { name: 'Sign of Ill Omen', minLevel: 5, spells: ['Bestow Curse'], summary: `Cast Bestow Curse ${ONCE}.` },
  { name: 'Thief of Five Fates', spells: ['Bane'], summary: `Cast Bane ${ONCE}.` },
  { name: 'Thirsting Blade', minLevel: 5, needs: BLADE, summary: 'Attack twice with your pact weapon when you take the Attack action.' },
  { name: 'Tomb of Levistus', minLevel: 5, timing: 'reaction', summary: 'When you take damage, encase yourself in ice: gain 10 temporary HP per warlock level (they soak the triggering damage), then until the end of your next turn you’re vulnerable to fire, speed 0 and incapacitated. Once per short or long rest.' },
  { name: 'Trickster’s Escape', minLevel: 7, spells: ['Freedom of Movement'], summary: 'Cast Freedom of Movement on yourself once per long rest without a slot.' },
  { name: 'Undying Servitude', minLevel: 5, spells: ['Animate Dead'], summary: 'Cast Animate Dead once per long rest without a slot.' },
  { name: 'Visions of Distant Realms', minLevel: 15, spells: ['Arcane Eye'], summary: 'Cast Arcane Eye at will, without a slot.' },
  { name: 'Voice of the Chain Master', needs: CHAIN, summary: 'Talk telepathically with your familiar, perceive through its senses and speak through it, anywhere on the same plane.' },
  { name: 'Whispers of the Grave', minLevel: 9, spells: ['Speak with Dead'], summary: 'Cast Speak with Dead at will, without a slot.' },
  { name: 'Witch Sight', minLevel: 15, summary: 'See the true form of shapechangers and of creatures hidden by illusion or transmutation magic within 30 ft.' },
]);

const METAMAGIC = group('metamagic', [
  { name: 'Careful Spell', timing: 'special', cost: '1 sorcery point', summary: 'Creatures you choose (up to your Charisma modifier) automatically succeed on the spell’s saving throw.' },
  { name: 'Distant Spell', timing: 'special', cost: '1 sorcery point', summary: 'Double the spell’s range, or give a touch spell a range of 30 ft.' },
  { name: 'Empowered Spell', timing: 'special', cost: '1 sorcery point', summary: 'Reroll damage dice (up to your Charisma modifier) and keep the new rolls. Can be combined with another Metamagic.' },
  { name: 'Extended Spell', timing: 'special', cost: '1 sorcery point', summary: 'Double the duration of a spell that lasts 1 minute or longer, up to 24 hours.' },
  { name: 'Heightened Spell', timing: 'special', cost: '3 sorcery points', summary: 'One target has disadvantage on its first saving throw against the spell.' },
  { name: 'Quickened Spell', timing: 'bonus', cost: '2 sorcery points', summary: 'Cast a spell with a casting time of 1 action as a bonus action instead.' },
  { name: 'Seeking Spell', timing: 'special', cost: '2 sorcery points', summary: 'Reroll a missed spell attack roll; you must use the new roll. Can be combined with another Metamagic.' },
  { name: 'Subtle Spell', timing: 'special', cost: '1 sorcery point', summary: 'Cast without verbal or somatic components.' },
  { name: 'Transmuted Spell', timing: 'special', cost: '1 sorcery point', summary: 'Swap the spell’s damage type between acid, cold, fire, lightning, poison and thunder.' },
  { name: 'Twinned Spell', timing: 'special', cost: 'Sorcery points equal to the spell’s level (1 for a cantrip)', summary: 'Aim a single-target spell at a second creature in range.' },
]);

const DIE = '1 superiority die';

const MANEUVERS = group('maneuver', [
  { name: 'Ambush', timing: 'special', cost: DIE, summary: 'Add the die to a Stealth check or an initiative roll.' },
  { name: 'Bait and Switch', timing: 'special', cost: DIE, summary: 'On your turn, swap places with a willing creature within 5 ft (spending 5 ft of movement, no opportunity attacks); one of you adds the die to AC until your next turn.' },
  { name: 'Brace', timing: 'reaction', cost: DIE, summary: 'When a creature you can see moves into your reach, attack it with a weapon and add the die to damage.' },
  { name: 'Commander’s Strike', timing: 'bonus', cost: DIE, summary: 'Give up one of your attacks: an ally who can see or hear you uses their reaction to attack, adding the die to damage.' },
  { name: 'Commanding Presence', timing: 'special', cost: DIE, summary: 'Add the die to an Intimidation, Performance or Persuasion check.' },
  { name: 'Disarming Attack', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; the target makes a Strength save or drops an item it’s holding.' },
  { name: 'Distracting Strike', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; the next attack against the target by someone else has advantage (until your next turn).' },
  { name: 'Evasive Footwork', timing: 'special', cost: DIE, summary: 'When you move, add the die to your AC until you stop moving.' },
  { name: 'Feinting Attack', timing: 'bonus', cost: DIE, summary: 'Feint at a creature within 5 ft: advantage on your next attack against it this turn, and add the die to damage if it hits.' },
  { name: 'Goading Attack', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; the target makes a Wisdom save or has disadvantage on attacks against anyone but you until your next turn ends.' },
  { name: 'Grappling Strike', timing: 'bonus', cost: DIE, summary: 'Right after you hit with a melee attack, try to grapple the target, adding the die to your Athletics check.' },
  { name: 'Lunging Attack', timing: 'special', cost: DIE, summary: 'Add 5 ft to your reach for one melee attack, and add the die to damage if it hits.' },
  { name: 'Maneuvering Attack', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; an ally can use their reaction to move half their speed without provoking the target.' },
  { name: 'Menacing Attack', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; the target makes a Wisdom save or is frightened of you until your next turn ends.' },
  { name: 'Parry', timing: 'reaction', cost: DIE, summary: 'When a melee attack damages you, reduce it by the die + your Dexterity modifier.' },
  { name: 'Precision Attack', timing: 'special', cost: DIE, summary: 'Add the die to a weapon attack roll, before or after rolling but before you know the result.' },
  { name: 'Pushing Attack', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; a Large or smaller target makes a Strength save or is pushed up to 15 ft away.' },
  { name: 'Quick Toss', timing: 'bonus', cost: DIE, summary: 'Draw and throw a weapon with the thrown property, adding the die to damage on a hit.' },
  { name: 'Rally', timing: 'bonus', cost: DIE, summary: 'An ally who can see or hear you gains temporary HP equal to the die + your Charisma modifier.' },
  { name: 'Riposte', timing: 'reaction', cost: DIE, summary: 'When a creature misses you with a melee attack, attack it and add the die to damage.' },
  { name: 'Sweeping Attack', timing: 'special', cost: DIE, summary: 'On a melee hit, deal the die’s roll to a second creature within 5 ft of the first and in your reach, if the original attack roll would hit it.' },
  { name: 'Tactical Assessment', timing: 'special', cost: DIE, summary: 'Add the die to an Investigation, History or Insight check.' },
  { name: 'Trip Attack', timing: 'special', cost: DIE, summary: 'On a hit, add the die to damage; a Large or smaller target makes a Strength save or falls prone.' },
]);

const INFUSIONS = group('infusion', [
  { name: 'Arcane Propulsion Armor', minLevel: 14, summary: 'Armor: +5 ft walking speed, magical force gauntlets (1d8, thrown 20/60, they fly back), can’t be removed against your will, and replaces missing limbs.' },
  { name: 'Armor of Magical Strength', summary: 'Armor with 6 charges (1d6 back at dawn): spend one to add Intelligence to a Strength check or save, or as a reaction to avoid being knocked prone.' },
  { name: 'Boots of the Winding Path', minLevel: 6, timing: 'bonus', summary: 'Boots: teleport up to 15 ft to a space you occupied earlier this turn.' },
  { name: 'Enhanced Arcane Focus', summary: 'Rod, staff or wand: +1 to spell attack rolls (+2 at artificer 10), and spell attacks ignore half cover.' },
  { name: 'Enhanced Defense', summary: 'Armor or shield: +1 AC (+2 at artificer 10).' },
  { name: 'Enhanced Weapon', summary: 'Simple or martial weapon: +1 to attack and damage (+2 at artificer 10).' },
  { name: 'Helm of Awareness', minLevel: 10, summary: 'Helmet: advantage on initiative, and the wearer can’t be surprised while not incapacitated.' },
  { name: 'Homunculus Servant', summary: 'Build a small construct helper that acts on your initiative; command it with your bonus action. It can deliver your touch spells.' },
  { name: 'Mind Sharpener', summary: 'Armor or robes with 4 charges (1d4 back at dawn): reaction when the wearer fails a concentration save, to succeed instead.' },
  { name: 'Radiant Weapon', minLevel: 6, summary: 'Weapon: +1 to attack and damage, sheds light on command, and with 4 charges can blind an attacker who hits you (reaction, Constitution save).' },
  { name: 'Repeating Shot', summary: 'Ammunition weapon: +1 to attack and damage, ignores the loading property and makes its own ammunition.' },
  { name: 'Replicate Magic Item', summary: 'Copy a magic item from the artificer’s replication tables. Can be learned more than once, for a different item each time; write the item in Notes or as your own option.' },
  { name: 'Repulsion Shield', minLevel: 6, timing: 'reaction', summary: 'Shield: +1 AC, and with 4 charges (1d4 back at dawn) push a creature that hits you up to 15 ft away.' },
  { name: 'Resistant Armor', minLevel: 6, summary: 'Armor: resistance to one damage type chosen when you infuse it.' },
  { name: 'Returning Weapon', summary: 'Thrown weapon: +1 to attack and damage, and it flies back to your hand after a ranged attack.' },
  { name: 'Spell-Refueling Ring', minLevel: 6, timing: 'action', summary: 'Ring: recover one spell slot of 3rd level or lower. Once per day, back at dawn.' },
]);

export const FEATURE_OPTIONS: FeatureOption[] = [
  ...FIGHTING_STYLES, ...PACT_BOONS, ...INVOCATIONS, ...METAMAGIC, ...MANEUVERS, ...INFUSIONS,
];

const BY_KEY = new Map(FEATURE_OPTIONS.map((o) => [`${o.group}:${o.index}`, o]));

export const findOption = (groupKey: string, index: string): FeatureOption | undefined => BY_KEY.get(`${groupKey}:${index}`);

export const optionsIn = (groupKey: OptionGroup): FeatureOption[] => FEATURE_OPTIONS.filter((o) => o.group === groupKey);
