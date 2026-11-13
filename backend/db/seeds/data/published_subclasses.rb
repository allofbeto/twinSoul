# Published (non-SRD) subclasses, added next to each class's SRD subclass.
#
# Like published_races.rb: only names, levels and short summaries written
# for twinSoul are stored. The books' text is copyrighted, so DO NOT paste
# it in; keep every description a brief paraphrase of what a feature does.
#
# Feature levels follow each class's subclass progression (2014 rules).

module PublishedSubclasses
  module_function

  def slug(text)
    text.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-|-\z/, '')
  end

  def f(name, desc)
    { 'index' => slug(name), 'name' => name, 'desc' => [desc] }
  end

  # features: { level => [f(...), ...] }
  def sub(name, source, desc, features)
    {
      'index' => slug(name),
      'name' => name,
      'source' => source,
      'desc' => [desc],
      'levels' => features.sort.map { |level, list| { 'level' => level, 'features' => list } },
    }
  end

  PHB = "Player's Handbook"
  XGTE = "Xanathar's Guide to Everything"
  TCOE = "Tasha's Cauldron of Everything"
  SCAG = "Sword Coast Adventurer's Guide"
  DMG = "Dungeon Master's Guide"
  EGTW = "Explorer's Guide to Wildemount"
  VRGR = "Van Richten's Guide to Ravenloft"
  FTOD = "Fizban's Treasury of Dragons"

  BY_CLASS = {}

  BY_CLASS['barbarian'] = [
    sub('Path of the Totem Warrior', PHB, 'Draws strength from a spirit animal: bear, eagle or wolf.', {
      3 => [f('Spirit Seeker', 'Cast beast sense and speak with animals as rituals.'),
            f('Totem Spirit', 'Choose a totem: Bear (resist all damage but psychic while raging), Eagle (Dash as a bonus action, enemies have disadvantage on opportunity attacks) or Wolf (allies have advantage on melee attacks near you).')],
      6 => [f('Aspect of the Beast', 'Gain a lasting gift from a totem, such as doubled carrying capacity, keen sight or easy tracking.')],
      10 => [f('Spirit Walker', 'Cast commune with nature as a ritual.')],
      14 => [f('Totemic Attunement', 'A stronger rage benefit from your totem, such as hampering foes, flying or knocking enemies prone.')],
    }),
    sub('Path of the Ancestral Guardian', XGTE, 'Calls on ancestor spirits to protect allies.', {
      3 => [f('Ancestral Protectors', 'The first creature you hit while raging has disadvantage against others, and allies resist its damage.')],
      6 => [f('Spirit Shield', 'Use your reaction to reduce damage to an ally near you by 2d6 (more at higher levels).')],
      10 => [f('Consult the Spirits', 'Cast augury or clairvoyance without a slot once per rest.')],
      14 => [f('Vengeful Ancestors', 'Damage your Spirit Shield prevents is dealt back to the attacker.')],
    }),
    sub('Path of the Storm Herald', XGTE, 'Rage becomes a storm of desert, sea or tundra.', {
      3 => [f('Storm Aura', 'While raging, an aura deals fire damage, grants temporary HP, or deals lightning damage, depending on your environment.')],
      6 => [f('Storm Soul', 'Gain a resistance and a utility benefit tied to your chosen environment.')],
      10 => [f('Shielding Storm', 'Allies in your aura share your Storm Soul resistance.')],
      14 => [f('Raging Storm', 'Your aura gains a reaction effect: burn, knock prone or slow attackers.')],
    }),
    sub('Path of the Zealot', XGTE, 'A warrior fuelled by divine fury.', {
      3 => [f('Divine Fury', 'Your first hit each turn while raging deals extra radiant or necrotic damage.'),
            f('Warrior of the Gods', 'Spells that raise you from the dead need no material components.')],
      6 => [f('Fanatical Focus', 'Reroll a failed saving throw once per rage.')],
      10 => [f('Zealous Presence', 'Give up to ten allies advantage on attacks and saves until your next turn, once per long rest.')],
      14 => [f('Rage Beyond Death', 'While raging, dropping to 0 HP does not knock you out until the rage ends.')],
    }),
    sub('Path of the Beast', TCOE, 'Rage unleashes a bestial transformation.', {
      3 => [f('Form of the Beast', 'When you rage, grow a bite, claws or a tail as natural weapons.')],
      6 => [f('Bestial Soul', 'Your natural weapons count as magical, and you gain swimming, climbing or jumping prowess.')],
      10 => [f('Infectious Fury', 'Hits can curse a target to attack someone else or take psychic damage.')],
      14 => [f('Call the Hunt', 'Share your fury with allies, adding damage and gaining temporary HP.')],
    }),
    sub('Path of Wild Magic', TCOE, 'Rage surges with unpredictable magic.', {
      3 => [f('Magic Awareness', 'Sense spells and magic items nearby.'),
            f('Wild Surge', 'Entering a rage triggers a random magical effect.')],
      6 => [f('Bolstering Magic', 'Boost an ally\'s rolls or restore a spell slot.')],
      10 => [f('Unstable Backlash', 'When hurt or failing a save while raging, reroll your Wild Surge.')],
      14 => [f('Controlled Surge', 'Roll twice on the Wild Surge table and pick.')],
    }),
    sub('Path of the Battlerager', SCAG, 'A spiked-armour brawler.', {
      3 => [f('Battlerager Armor', 'While raging in spiked armour, make a bonus spike attack and damage grapplers.')],
      6 => [f('Reckless Abandon', 'Reckless Attack while raging gives temporary HP.')],
      10 => [f('Battlerager Charge', 'Dash as a bonus action while raging.')],
      14 => [f('Spiked Retribution', 'Creatures that hit you in melee take piercing damage.')],
    }),
  ]

  BY_CLASS['bard'] = [
    sub('College of Valor', PHB, 'Skalds who inspire heroes in battle.', {
      3 => [f('Bonus Proficiencies', 'Medium armour, shields and martial weapons.'),
            f('Combat Inspiration', 'Bardic Inspiration can add to damage or AC.')],
      6 => [f('Extra Attack', 'Attack twice when you take the Attack action.')],
      14 => [f('Battle Magic', 'After casting a spell, make a weapon attack as a bonus action.')],
    }),
    sub('College of Glamour', XGTE, 'Performers touched by the Feywild.', {
      3 => [f('Mantle of Inspiration', 'Spend inspiration to give allies temporary HP and a free move.'),
            f('Enthralling Performance', 'A performance can charm listeners.')],
      6 => [f('Mantle of Majesty', 'Cast command as a bonus action each turn for a minute.')],
      14 => [f('Unbreakable Majesty', 'Attackers must make a Charisma save or pick a new target.')],
    }),
    sub('College of Swords', XGTE, 'Blade-dancing entertainers.', {
      3 => [f('Bonus Proficiencies', 'Medium armour and scimitars; use weapons as a spellcasting focus.'),
            f('Fighting Style', 'Dueling or Two-Weapon Fighting.'),
            f('Blade Flourish', 'Flourishes add inspiration to damage with extra defence, reach or a push.')],
      6 => [f('Extra Attack', 'Attack twice when you take the Attack action.')],
      14 => [f('Master\'s Flourish', 'Use a d6 for flourishes instead of spending inspiration.')],
    }),
    sub('College of Whispers', XGTE, 'Spies who trade in secrets and fear.', {
      3 => [f('Psychic Blades', 'Spend inspiration to add psychic damage to a hit.'),
            f('Words of Terror', 'A quiet talk can frighten a listener.')],
      6 => [f('Mantle of Whispers', 'Steal the shadow of someone who dies near you to disguise yourself as them.')],
      14 => [f('Shadow Lore', 'Magically command a creature that fears its secrets being revealed.')],
    }),
    sub('College of Creation', TCOE, 'Bards who sing things into being.', {
      3 => [f('Mote of Potential', 'Inspiration dice gain an extra effect.'),
            f('Performance of Creation', 'Create a nonmagical item from nothing.')],
      6 => [f('Animating Performance', 'Bring an object to life as a dancing companion.')],
      14 => [f('Creative Crescendo', 'Create several items at once, and larger ones.')],
    }),
    sub('College of Eloquence', TCOE, 'Masters of persuasion and rhetoric.', {
      3 => [f('Silver Tongue', 'Treat low Persuasion and Deception rolls as 10.'),
            f('Unsettling Words', 'Spend inspiration to lower a creature\'s next save.')],
      6 => [f('Unfailing Inspiration', 'Inspiration that fails is not used up.'),
            f('Universal Speech', 'Make creatures understand you regardless of language.')],
      14 => [f('Infectious Inspiration', 'When inspiration succeeds, pass a free die to someone else.')],
    }),
    sub('College of Spirits', VRGR, 'Storytellers who channel spirits.', {
      3 => [f('Guiding Whispers', 'Learn guidance, with long range.'),
            f('Spiritual Focus', 'Use a candle, skull or crystal ball as a focus to boost spells.'),
            f('Tales from Beyond', 'Spend inspiration to roll for a random spirit tale effect.')],
      6 => [f('Spirit Session', 'A ritual teaches you a temporary spell from any class.')],
      14 => [f('Mystical Connection', 'Roll twice for tales and choose.')],
    }),
  ]

  BY_CLASS['cleric'] = [
    sub('Knowledge Domain', PHB, 'Gods of learning and understanding.', {
      1 => [f('Domain Spells', 'Always-prepared knowledge spells as you level.'),
            f('Blessings of Knowledge', 'Two extra languages and expertise in two knowledge skills.')],
      2 => [f('Channel Divinity: Knowledge of the Ages', 'Gain proficiency in any skill or tool for 10 minutes.')],
      6 => [f('Channel Divinity: Read Thoughts', 'Read a creature\'s surface thoughts and cast suggestion on it.')],
      8 => [f('Potent Spellcasting', 'Add Wisdom to cleric cantrip damage.')],
      17 => [f('Visions of the Past', 'Meditate to see the history of an object or place.')],
    }),
    sub('Light Domain', PHB, 'Gods of fire, sun and truth.', {
      1 => [f('Domain Spells', 'Always-prepared light and fire spells.'),
            f('Bonus Cantrip', 'Learn light.'),
            f('Warding Flare', 'Impose disadvantage on an attack against you with a burst of light.')],
      2 => [f('Channel Divinity: Radiance of the Dawn', 'Dispel magical darkness and burn nearby foes with radiant light.')],
      6 => [f('Improved Flare', 'Warding Flare protects allies too.')],
      8 => [f('Potent Spellcasting', 'Add Wisdom to cleric cantrip damage.')],
      17 => [f('Corona of Light', 'Emit sunlight that weakens enemies against fire and radiant spells.')],
    }),
    sub('Nature Domain', PHB, 'Gods of the wild.', {
      1 => [f('Domain Spells', 'Always-prepared nature spells.'),
            f('Acolyte of Nature', 'Learn a druid cantrip and a nature skill.'),
            f('Bonus Proficiency', 'Heavy armour.')],
      2 => [f('Channel Divinity: Charm Animals and Plants', 'Charm nearby beasts and plant creatures.')],
      6 => [f('Dampen Elements', 'Grant resistance to an elemental damage type as a reaction.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra cold, fire or lightning damage.')],
      17 => [f('Master of Nature', 'Command creatures you have charmed.')],
    }),
    sub('Tempest Domain', PHB, 'Gods of storms and the sea.', {
      1 => [f('Domain Spells', 'Always-prepared storm spells.'),
            f('Bonus Proficiencies', 'Martial weapons and heavy armour.'),
            f('Wrath of the Storm', 'Blast attackers with thunder or lightning as a reaction.')],
      2 => [f('Channel Divinity: Destructive Wrath', 'Maximise lightning or thunder damage.')],
      6 => [f('Thunderbolt Strike', 'Lightning damage can push creatures away.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra thunder damage.')],
      17 => [f('Stormborn', 'Fly at your walking speed outdoors.')],
    }),
    sub('Trickery Domain', PHB, 'Gods of mischief and deception.', {
      1 => [f('Domain Spells', 'Always-prepared trickery spells.'),
            f('Blessing of the Trickster', 'Give a creature advantage on Stealth.')],
      2 => [f('Channel Divinity: Invoke Duplicity', 'Create an illusory double to cast spells from and gain advantage.')],
      6 => [f('Channel Divinity: Cloak of Shadows', 'Turn invisible until your next turn.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra poison damage.')],
      17 => [f('Improved Duplicity', 'Create up to four duplicates.')],
    }),
    sub('War Domain', PHB, 'Gods of battle.', {
      1 => [f('Domain Spells', 'Always-prepared war spells.'),
            f('Bonus Proficiencies', 'Martial weapons and heavy armour.'),
            f('War Priest', 'Make a bonus weapon attack a few times per rest.')],
      2 => [f('Channel Divinity: Guided Strike', 'Add +10 to an attack roll.')],
      6 => [f('Channel Divinity: War God\'s Blessing', 'Add +10 to an ally\'s attack roll.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra damage of the weapon\'s type.')],
      17 => [f('Avatar of Battle', 'Resist nonmagical bludgeoning, piercing and slashing damage.')],
    }),
    sub('Death Domain', DMG, 'Gods of death and the undead.', {
      1 => [f('Domain Spells', 'Always-prepared necromantic spells.'),
            f('Bonus Proficiency', 'Martial weapons.'),
            f('Reaper', 'Learn a necromancy cantrip that can target two creatures.')],
      2 => [f('Channel Divinity: Touch of Death', 'Add heavy necrotic damage to a melee hit.')],
      6 => [f('Inescapable Destruction', 'Your necrotic damage ignores resistance.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra necrotic damage.')],
      17 => [f('Improved Reaper', 'Single-target necromancy spells can target two creatures.')],
    }),
    sub('Forge Domain', XGTE, 'Gods of craft and smithing.', {
      1 => [f('Domain Spells', 'Always-prepared forge spells.'),
            f('Bonus Proficiencies', 'Heavy armour and smith\'s tools.'),
            f('Blessing of the Forge', 'Make a weapon or armour +1 for the day.')],
      2 => [f('Channel Divinity: Artisan\'s Blessing', 'Forge a metal item in an hour-long ritual.')],
      6 => [f('Soul of the Forge', 'Fire resistance, and +1 AC in heavy armour.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra fire damage.')],
      17 => [f('Saint of Forge and Fire', 'Immune to fire, and resist nonmagical weapons in heavy armour.')],
    }),
    sub('Grave Domain', XGTE, 'Guardians of the line between life and death.', {
      1 => [f('Domain Spells', 'Always-prepared grave spells.'),
            f('Circle of Mortality', 'Maximise healing on creatures at 0 HP; spare the dying at range.'),
            f('Eyes of the Grave', 'Sense undead nearby.')],
      2 => [f('Channel Divinity: Path to the Grave', 'Make a creature vulnerable to the next hit.')],
      6 => [f('Sentinel at Death\'s Door', 'Turn a critical hit into a normal hit.')],
      8 => [f('Potent Spellcasting', 'Add Wisdom to cleric cantrip damage.')],
      17 => [f('Keeper of Souls', 'Heal when an enemy dies nearby.')],
    }),
    sub('Order Domain', TCOE, 'Gods of law and command.', {
      1 => [f('Domain Spells', 'Always-prepared order spells.'),
            f('Bonus Proficiencies', 'Heavy armour and Intimidation or Persuasion.'),
            f('Voice of Authority', 'Buffing an ally lets them attack as a reaction.')],
      2 => [f('Channel Divinity: Order\'s Demand', 'Charm nearby creatures and make them drop items.')],
      6 => [f('Embodiment of the Law', 'Cast enchantment spells as a bonus action.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra psychic damage.')],
      17 => [f('Order\'s Wrath', 'Curse a creature so allies deal extra damage to it.')],
    }),
    sub('Peace Domain', TCOE, 'Gods of harmony.', {
      1 => [f('Domain Spells', 'Always-prepared peace spells.'),
            f('Implement of Peace', 'Insight, Performance or Persuasion proficiency.'),
            f('Emboldening Bond', 'Bond allies to add a d4 to rolls.')],
      2 => [f('Channel Divinity: Balm of Peace', 'Move without provoking and heal those you pass.')],
      6 => [f('Protective Bond', 'Bonded allies can teleport to take hits for each other.')],
      8 => [f('Potent Spellcasting', 'Add Wisdom to cleric cantrip damage.')],
      17 => [f('Expansive Bond', 'Longer bond range and shared resistance.')],
    }),
    sub('Twilight Domain', TCOE, 'Gods of dusk and dreams.', {
      1 => [f('Domain Spells', 'Always-prepared twilight spells.'),
            f('Bonus Proficiencies', 'Martial weapons and heavy armour.'),
            f('Eyes of Night', 'Long darkvision you can share.'),
            f('Vigilant Blessing', 'Give a creature advantage on initiative.')],
      2 => [f('Channel Divinity: Twilight Sanctuary', 'An aura of dim light gives temporary HP or ends charm and fear.')],
      6 => [f('Steps of Night', 'Fly in dim light or darkness.')],
      8 => [f('Divine Strike', 'Weapon hits deal extra radiant damage.')],
      17 => [f('Twilight Shroud', 'Your sanctuary gives half cover.')],
    }),
    sub('Arcana Domain', SCAG, 'Gods of magic.', {
      1 => [f('Domain Spells', 'Always-prepared arcane spells.'),
            f('Arcane Initiate', 'Arcana proficiency and two wizard cantrips.')],
      2 => [f('Channel Divinity: Arcane Abjuration', 'Turn or banish celestials, elementals, fey and fiends.')],
      6 => [f('Spell Breaker', 'Healing an ally also ends a spell on them.')],
      8 => [f('Potent Spellcasting', 'Add Wisdom to cleric cantrip damage.')],
      17 => [f('Arcane Mastery', 'Add four high-level wizard spells as domain spells.')],
    }),
  ]

  BY_CLASS['druid'] = [
    sub('Circle of the Moon', PHB, 'Shapeshifters of the wild.', {
      2 => [f('Combat Wild Shape', 'Wild Shape as a bonus action and heal while transformed.'),
            f('Circle Forms', 'Turn into stronger beasts (CR 1, higher later).')],
      6 => [f('Primal Strike', 'Beast attacks count as magical.')],
      10 => [f('Elemental Wild Shape', 'Spend two uses to become an elemental.')],
      14 => [f('Thousand Forms', 'Cast alter self at will.')],
    }),
    sub('Circle of Dreams', XGTE, 'Druids tied to the Feywild.', {
      2 => [f('Balm of the Summer Court', 'Heal allies at range with a pool of d6s.')],
      6 => [f('Hearth of Moonlight and Shadow', 'Protect a camp during rests.')],
      10 => [f('Hidden Paths', 'Teleport yourself or an ally short distances.')],
      14 => [f('Walker in Dreams', 'Cast dream, scrying or teleportation circle once per rest.')],
    }),
    sub('Circle of the Shepherd', XGTE, 'Guardians of beasts and summoned spirits.', {
      2 => [f('Speech of the Woods', 'Speak Sylvan and talk with beasts.'),
            f('Spirit Totem', 'Summon a bear, hawk or unicorn spirit aura.')],
      6 => [f('Mighty Summoner', 'Summoned creatures are tougher and hit harder.')],
      10 => [f('Guardian Spirit', 'Summons heal at the end of their turns in your aura.')],
      14 => [f('Faithful Summons', 'Beasts appear to defend you when you are downed.')],
    }),
    sub('Circle of Spores', TCOE, 'Druids of decay and fungus.', {
      2 => [f('Circle Spells', 'Always-prepared decay spells.'),
            f('Halo of Spores', 'Deal necrotic damage to creatures near you.'),
            f('Symbiotic Entity', 'Use Wild Shape for temporary HP and stronger spores.')],
      6 => [f('Fungal Infestation', 'Raise slain creatures as short-lived zombies.')],
      10 => [f('Spreading Spores', 'Throw your spores to a distant area.')],
      14 => [f('Fungal Body', 'Immune to blinding, deafening, fright and poison; ignore critical hits.')],
    }),
    sub('Circle of Stars', TCOE, 'Druids who read the constellations.', {
      2 => [f('Star Map', 'A focus that grants guidance and guiding bolt.'),
            f('Starry Form', 'Use Wild Shape to become a constellation: archer, chalice or dragon.')],
      6 => [f('Cosmic Omen', 'Add or subtract a d6 from rolls near you.')],
      10 => [f('Twinkling Constellations', 'Starry forms grow stronger and can switch.')],
      14 => [f('Full of Stars', 'Resist bludgeoning, piercing and slashing damage in starry form.')],
    }),
    sub('Circle of Wildfire', TCOE, 'Druids of renewal through fire.', {
      2 => [f('Circle Spells', 'Always-prepared fire spells.'),
            f('Summon Wildfire Spirit', 'Use Wild Shape to summon a fiery companion.')],
      6 => [f('Enhanced Bond', 'Your fire and healing spells get stronger near your spirit.')],
      10 => [f('Cauterizing Flames', 'Heal or burn creatures where others fall.')],
      14 => [f('Blazing Revival', 'Your spirit can sacrifice itself to revive you.')],
    }),
  ]

  BY_CLASS['fighter'] = [
    sub('Battle Master', PHB, 'A tactician who fights with manoeuvres.', {
      3 => [f('Combat Superiority', 'Learn manoeuvres powered by superiority dice (d8, four per rest).'),
            f('Student of War', 'Proficiency with one artisan\'s tool.')],
      7 => [f('Know Your Enemy', 'Study a creature to learn how it compares to you.')],
      10 => [f('Improved Combat Superiority', 'Superiority dice become d10s.')],
      15 => [f('Relentless', 'Regain a superiority die when you roll initiative with none left.')],
      18 => [f('Improved Combat Superiority', 'Superiority dice become d12s.')],
    }),
    sub('Eldritch Knight', PHB, 'A warrior who studies wizard magic.', {
      3 => [f('Spellcasting', 'Cast abjuration and evocation wizard spells (Intelligence).'),
            f('Weapon Bond', 'Bind weapons so they cannot be disarmed and can be summoned.')],
      7 => [f('War Magic', 'Cast a cantrip and make a weapon attack as a bonus action.')],
      10 => [f('Eldritch Strike', 'Hits give the target disadvantage against your next spell.')],
      15 => [f('Arcane Charge', 'Teleport when you Action Surge.')],
      18 => [f('Improved War Magic', 'Cast a spell and make a bonus weapon attack.')],
    }),
    sub('Arcane Archer', XGTE, 'Archers who weave magic into arrows.', {
      3 => [f('Arcane Archer Lore', 'Arcana or Nature, and a cantrip.'),
            f('Arcane Shot', 'Imbue arrows with magical effects twice per rest.')],
      7 => [f('Magic Arrow', 'Arrows count as magical.'),
            f('Curving Shot', 'Redirect a missed magic arrow.')],
      10 => [f('Additional Arcane Shot Option', 'Learn another Arcane Shot.')],
      15 => [f('Ever-Ready Shot', 'Regain an Arcane Shot when you roll initiative with none left.')],
      18 => [f('Improved Shots', 'Arcane Shots deal more damage.')],
    }),
    sub('Cavalier', XGTE, 'A mounted defender.', {
      3 => [f('Bonus Proficiency', 'A skill or language.'),
            f('Born to the Saddle', 'Stay mounted easily and mount quickly.'),
            f('Unwavering Mark', 'Mark foes so they suffer for attacking others.')],
      7 => [f('Warding Maneuver', 'Add a d8 to an ally\'s AC and reduce the damage they take.')],
      10 => [f('Hold the Line', 'Opportunity attacks stop enemies moving.')],
      15 => [f('Ferocious Charger', 'Knock foes prone when charging.')],
      18 => [f('Vigilant Defender', 'An extra opportunity attack each round.')],
    }),
    sub('Samurai', XGTE, 'A warrior of unbreakable resolve.', {
      3 => [f('Bonus Proficiency', 'A social skill or language.'),
            f('Fighting Spirit', 'Gain advantage and temporary HP as a bonus action, three times per rest.')],
      7 => [f('Elegant Courtier', 'Add Wisdom to Persuasion; extra save proficiency.')],
      10 => [f('Tireless Spirit', 'Regain Fighting Spirit when you roll initiative with none left.')],
      15 => [f('Rapid Strike', 'Trade advantage for an extra attack.')],
      18 => [f('Strength Before Death', 'Take an extra turn when you drop to 0 HP.')],
    }),
    sub('Psi Warrior', TCOE, 'A fighter with psionic power.', {
      3 => [f('Psionic Power', 'Psionic dice fuel a force strike, a protective field or telekinesis.')],
      7 => [f('Telekinetic Adept', 'Psionic leaps and a telekinetic thrust.')],
      10 => [f('Guarded Mind', 'Resist psychic damage and end charm or fear.')],
      15 => [f('Bulwark of Force', 'Give allies half cover.')],
      18 => [f('Telekinetic Master', 'Cast telekinesis and attack while holding it.')],
    }),
    sub('Rune Knight', TCOE, 'A warrior using giant runes.', {
      3 => [f('Bonus Proficiencies', 'Smith\'s tools and Giant.'),
            f('Rune Carver', 'Inscribe runes with passive and active powers.'),
            f('Giant\'s Might', 'Grow Large for extra damage and Strength advantage.')],
      7 => [f('Runic Shield', 'Force an attacker to reroll.')],
      10 => [f('Great Stature', 'Grow taller; Giant\'s Might deals more damage.')],
      15 => [f('Master of Runes', 'Use each rune twice per rest.')],
      18 => [f('Runic Juggernaut', 'Become Huge with more reach and damage.')],
    }),
    sub('Purple Dragon Knight', SCAG, 'A leader who rallies allies (also called Banneret).', {
      3 => [f('Rallying Cry', 'Second Wind also heals nearby allies.')],
      7 => [f('Royal Envoy', 'Persuasion expertise and a bonus social skill.')],
      10 => [f('Inspiring Surge', 'Action Surge lets an ally attack too.')],
      15 => [f('Bulwark', 'Share Indomitable with an ally.')],
    }),
    sub('Echo Knight', EGTW, 'A fighter who summons an echo of themselves.', {
      3 => [f('Manifest Echo', 'Create an echo you can attack from and swap places with.'),
            f('Unleash Incarnation', 'Make an extra attack through your echo.')],
      7 => [f('Echo Avatar', 'See and hear through your echo at long range.')],
      10 => [f('Shadow Martyr', 'Your echo takes a hit for an ally.')],
      15 => [f('Reclaim Potential', 'Gain temporary HP when your echo is destroyed.')],
      18 => [f('Legion of One', 'Create two echoes.')],
    }),
  ]

  BY_CLASS['monk'] = [
    sub('Way of Shadow', PHB, 'Ninja-like masters of darkness.', {
      3 => [f('Shadow Arts', 'Spend ki to cast darkness, darkvision, pass without trace or silence.')],
      6 => [f('Shadow Step', 'Teleport between shadows with advantage on your next attack.')],
      11 => [f('Cloak of Shadows', 'Become invisible in darkness.')],
      17 => [f('Opportunist', 'Attack creatures hit by your allies.')],
    }),
    sub('Way of the Four Elements', PHB, 'Monks who bend the elements with ki.', {
      3 => [f('Disciple of the Elements', 'Learn elemental disciplines powered by ki.')],
      6 => [f('Extra Elemental Discipline', 'Learn more disciplines as you level.')],
    }),
    sub('Way of the Drunken Master', XGTE, 'A swaying, unpredictable fighter.', {
      3 => [f('Bonus Proficiencies', 'Performance and brewer\'s supplies.'),
            f('Drunken Technique', 'Flurry of Blows also grants Disengage and speed.')],
      6 => [f('Tipsy Sway', 'Stand up cheaply and redirect missed attacks.')],
      11 => [f('Drunkard\'s Luck', 'Spend ki to cancel disadvantage.')],
      17 => [f('Intoxicated Frenzy', 'Flurry of Blows can hit more targets.')],
    }),
    sub('Way of the Kensei', XGTE, 'Monks who master chosen weapons.', {
      3 => [f('Path of the Kensei', 'Kensei weapons gain monk benefits and an AC trick.')],
      6 => [f('One with the Blade', 'Weapons count as magical; spend ki for extra damage.')],
      11 => [f('Sharpen the Blade', 'Spend ki to give a weapon a bonus.')],
      17 => [f('Unerring Accuracy', 'Reroll a missed weapon attack once per turn.')],
    }),
    sub('Way of the Sun Soul', XGTE, 'Monks who hurl radiant energy.', {
      3 => [f('Radiant Sun Bolt', 'A ranged radiant attack you can use with Martial Arts.')],
      6 => [f('Searing Arc Strike', 'Cast burning hands with ki.')],
      11 => [f('Searing Sunburst', 'Throw a radiant orb that explodes.')],
      17 => [f('Sun Shield', 'Shed light and burn melee attackers.')],
    }),
    sub('Way of Mercy', TCOE, 'Masked healers who also bring death.', {
      3 => [f('Implements of Mercy', 'Insight, Medicine and a herbalism kit.'),
            f('Hand of Healing', 'Spend ki to heal.'),
            f('Hand of Harm', 'Spend ki to add necrotic damage.')],
      6 => [f('Physician\'s Touch', 'Healing cures conditions; harming poisons.')],
      11 => [f('Flurry of Healing and Harm', 'Heal or harm with Flurry of Blows for free.')],
      17 => [f('Hand of Ultimate Mercy', 'Return a recently dead creature to life.')],
    }),
    sub('Way of the Astral Self', TCOE, 'Monks who summon their astral form.', {
      3 => [f('Arms of the Astral Self', 'Summon spectral arms that strike with Wisdom.')],
      6 => [f('Visage of the Astral Self', 'Summon an astral face with keen senses.')],
      11 => [f('Body of the Astral Self', 'Deflect energy and add damage.')],
      17 => [f('Awakened Astral Self', 'Full astral form with extra AC and attacks.')],
    }),
    sub('Way of the Long Death', SCAG, 'Monks obsessed with death.', {
      3 => [f('Touch of Death', 'Gain temporary HP when a creature near you dies.')],
      6 => [f('Hour of Reaping', 'Frighten creatures around you.')],
      11 => [f('Mastery of Death', 'Spend ki to stay at 1 HP.')],
      17 => [f('Touch of the Long Death', 'Spend ki for a burst of necrotic damage.')],
    }),
  ]

  BY_CLASS['paladin'] = [
    sub('Oath of the Ancients', PHB, 'Paladins who protect light and life.', {
      3 => [f('Oath Spells', 'Always-prepared nature and light spells.'),
            f('Channel Divinity', 'Nature\'s Wrath (restrain with vines) or Turn the Faithless.')],
      7 => [f('Aura of Warding', 'You and nearby allies resist spell damage.')],
      15 => [f('Undying Sentinel', 'Drop to 1 HP instead of 0 once per rest; you stop ageing.')],
      20 => [f('Elder Champion', 'Transform to regenerate and cast spells faster.')],
    }),
    sub('Oath of Vengeance', PHB, 'Relentless hunters of the wicked.', {
      3 => [f('Oath Spells', 'Always-prepared hunting spells.'),
            f('Channel Divinity', 'Abjure Enemy (frighten and stop) or Vow of Enmity (advantage on one foe).')],
      7 => [f('Relentless Avenger', 'Move after an opportunity attack hits.')],
      15 => [f('Soul of Vengeance', 'React with an attack when your sworn foe attacks.')],
      20 => [f('Avenging Angel', 'Grow wings and frighten enemies.')],
    }),
    sub('Oathbreaker', DMG, 'A paladin who broke their oath for dark ends.', {
      3 => [f('Oath Spells', 'Always-prepared dark spells.'),
            f('Channel Divinity', 'Control Undead or Dreadful Aspect.')],
      7 => [f('Aura of Hate', 'You and undead allies add Charisma to melee damage.')],
      15 => [f('Supernatural Resistance', 'Resist nonmagical weapon damage.')],
      20 => [f('Dread Lord', 'An aura of gloom that harms and weakens foes.')],
    }),
    sub('Oath of Conquest', XGTE, 'Paladins who rule through fear.', {
      3 => [f('Oath Spells', 'Always-prepared domination spells.'),
            f('Channel Divinity', 'Conquering Presence (frighten) or Guided Strike (+10 to hit).')],
      7 => [f('Aura of Conquest', 'Frightened enemies near you are stopped and take damage.')],
      15 => [f('Scornful Rebuke', 'Attackers take psychic damage.')],
      20 => [f('Invincible Conqueror', 'Resist all damage and attack more often.')],
    }),
    sub('Oath of Redemption', XGTE, 'Paladins who seek peace first.', {
      3 => [f('Oath Spells', 'Always-prepared calming spells.'),
            f('Channel Divinity', 'Emissary of Peace (Persuasion) or Rebuke the Violent.')],
      7 => [f('Aura of the Guardian', 'Take damage in place of a nearby ally.')],
      15 => [f('Protective Spirit', 'Heal at the end of your turns when badly hurt.')],
      20 => [f('Emissary of Redemption', 'Resist all damage and reflect harm from attackers.')],
    }),
    sub('Oath of Glory', TCOE, 'Paladins chasing heroic deeds.', {
      3 => [f('Oath Spells', 'Always-prepared heroic spells.'),
            f('Channel Divinity', 'Peerless Athlete or Inspiring Smite (temporary HP).')],
      7 => [f('Aura of Alacrity', 'More speed for you and nearby allies.')],
      15 => [f('Glorious Defense', 'Add Charisma to AC and counterattack.')],
      20 => [f('Living Legend', 'Advantage on Charisma checks and turn misses into hits.')],
    }),
    sub('Oath of the Watchers', TCOE, 'Guards against extraplanar threats.', {
      3 => [f('Oath Spells', 'Always-prepared detection spells.'),
            f('Channel Divinity', 'Watcher\'s Will (mental saves) or Abjure the Extraplanar.')],
      7 => [f('Aura of the Sentinel', 'Allies near you add to initiative.')],
      15 => [f('Vigilant Rebuke', 'Damage creatures that try to charm or frighten allies.')],
      20 => [f('Mortal Bulwark', 'Truesight and banishing strikes.')],
    }),
    sub('Oath of the Crown', SCAG, 'Paladins sworn to law and a ruler.', {
      3 => [f('Oath Spells', 'Always-prepared command spells.'),
            f('Channel Divinity', 'Champion Challenge or Turn the Tide (heal allies).')],
      7 => [f('Divine Allegiance', 'Take damage for an ally.')],
      15 => [f('Unyielding Spirit', 'Advantage against paralysis and stunning.')],
      20 => [f('Exalted Champion', 'Resist nonmagical damage and boost allies\' saves.')],
    }),
  ]

  BY_CLASS['ranger'] = [
    sub('Beast Master', PHB, 'A ranger bonded with an animal companion.', {
      3 => [f('Ranger\'s Companion', 'Gain a beast companion that fights alongside you.')],
      7 => [f('Exceptional Training', 'Your beast can Dash, Disengage or Help as a bonus action; attacks are magical.')],
      11 => [f('Bestial Fury', 'Your beast attacks twice.')],
      15 => [f('Share Spells', 'Self-targeted spells also affect your beast.')],
    }),
    sub('Gloom Stalker', XGTE, 'Hunters of the dark places.', {
      3 => [f('Gloom Stalker Magic', 'Extra spells as you level.'),
            f('Dread Ambusher', 'Initiative bonus and an extra attack in the first round.'),
            f('Umbral Sight', 'Darkvision and invisibility to darkvision.')],
      7 => [f('Iron Mind', 'Wisdom save proficiency (or another).')],
      11 => [f('Stalker\'s Flurry', 'Make another attack after a miss.')],
      15 => [f('Shadowy Dodge', 'Impose disadvantage on an attack.')],
    }),
    sub('Horizon Walker', XGTE, 'Guardians of planar borders.', {
      3 => [f('Horizon Walker Magic', 'Extra spells as you level.'),
            f('Detect Portal', 'Sense planar portals.'),
            f('Planar Warrior', 'Add force damage to a hit.')],
      7 => [f('Ethereal Step', 'Step into the Ethereal Plane.')],
      11 => [f('Distant Strike', 'Teleport between attacks and hit more targets.')],
      15 => [f('Spectral Defense', 'Resist an attack\'s damage.')],
    }),
    sub('Monster Slayer', XGTE, 'Hunters of supernatural creatures.', {
      3 => [f('Monster Slayer Magic', 'Extra spells as you level.'),
            f('Hunter\'s Sense', 'Learn a creature\'s immunities and weaknesses.'),
            f('Slayer\'s Prey', 'Extra damage against a chosen target.')],
      7 => [f('Supernatural Defense', 'Add a d6 to saves against your prey.')],
      11 => [f('Magic-User\'s Nemesis', 'Make a spell or teleport fail.')],
      15 => [f('Slayer\'s Counter', 'Attack your prey when it forces a save.')],
    }),
    sub('Fey Wanderer', TCOE, 'Rangers touched by fey magic.', {
      3 => [f('Fey Wanderer Magic', 'Extra spells as you level.'),
            f('Dreadful Strikes', 'Add psychic damage to hits.'),
            f('Otherworldly Glamour', 'Add Wisdom to Charisma checks.')],
      7 => [f('Beguiling Twist', 'Redirect charm and fear onto others.')],
      11 => [f('Fey Reinforcements', 'Cast summon fey cheaply.')],
      15 => [f('Misty Wanderer', 'Cast misty step often and bring an ally.')],
    }),
    sub('Swarmkeeper', TCOE, 'Rangers bonded to a swarm of spirits.', {
      3 => [f('Gathered Swarm', 'Your swarm adds damage, pushes foes or moves you.'),
            f('Swarmkeeper Magic', 'Extra spells as you level.')],
      7 => [f('Writhing Tide', 'Your swarm lets you fly briefly.')],
      11 => [f('Mighty Swarm', 'Stronger swarm damage and effects.')],
      15 => [f('Swarming Dispersal', 'Resist damage and teleport as a reaction.')],
    }),
    sub('Drakewarden', FTOD, 'Rangers bonded to a young drake.', {
      3 => [f('Draconic Gift', 'A draconic language and a cantrip.'),
            f('Drake Companion', 'Summon a drake that grows with you.')],
      7 => [f('Bond of Fang and Scale', 'Ride your drake as it grows; it flies.')],
      11 => [f('Drake\'s Breath', 'Unleash a breath weapon.')],
      15 => [f('Perfected Bond', 'Your drake is larger and can shield you.')],
    }),
  ]

  BY_CLASS['rogue'] = [
    sub('Assassin', PHB, 'Masters of the killing blow.', {
      3 => [f('Bonus Proficiencies', 'Disguise and poisoner\'s kits.'),
            f('Assassinate', 'Advantage against creatures that have not acted; hits on surprised foes are critical.')],
      9 => [f('Infiltration Expertise', 'Build convincing false identities.')],
      13 => [f('Impostor', 'Mimic someone\'s speech and manner.')],
      17 => [f('Death Strike', 'Double damage against surprised creatures that fail a save.')],
    }),
    sub('Arcane Trickster', PHB, 'Rogues who use illusion and enchantment.', {
      3 => [f('Spellcasting', 'Cast enchantment and illusion wizard spells (Intelligence).'),
            f('Mage Hand Legerdemain', 'An invisible mage hand that can pick pockets.')],
      9 => [f('Magical Ambush', 'Hidden spellcasting imposes disadvantage on saves.')],
      13 => [f('Versatile Trickster', 'Use your mage hand to gain advantage.')],
      17 => [f('Spell Thief', 'Steal a spell cast at you.')],
    }),
    sub('Inquisitive', XGTE, 'Rogues who read people and spot lies.', {
      3 => [f('Ear for Deceit', 'Treat low Insight rolls as 8.'),
            f('Eye for Detail', 'Search or decipher clues as a bonus action.'),
            f('Insightful Fighting', 'Read a foe to use Sneak Attack without advantage.')],
      9 => [f('Steady Eye', 'Advantage on Perception and Investigation when moving slowly.')],
      13 => [f('Unerring Eye', 'Sense illusions and shapechangers.')],
      17 => [f('Eye for Weakness', 'Extra Sneak Attack damage against a read foe.')],
    }),
    sub('Mastermind', XGTE, 'Schemers and spymasters.', {
      3 => [f('Master of Intrigue', 'Disguise and forgery kits, gaming set and languages; mimic accents.'),
            f('Master of Tactics', 'Help at range as a bonus action.')],
      9 => [f('Insightful Manipulator', 'Learn how a creature compares to you mentally.')],
      13 => [f('Misdirection', 'Redirect an attack to a nearby creature.')],
      17 => [f('Soul of Deceit', 'Your thoughts cannot be read and you resist truth magic.')],
    }),
    sub('Scout', XGTE, 'Skirmishers and wilderness experts.', {
      3 => [f('Skirmisher', 'Move away when an enemy ends its turn near you.'),
            f('Survivalist', 'Nature and Survival expertise.')],
      9 => [f('Superior Mobility', 'Faster walking, climbing and swimming.')],
      13 => [f('Ambush Master', 'Initiative advantage; allies get advantage on your first target.')],
      17 => [f('Sudden Strike', 'Make a bonus attack that can also Sneak Attack.')],
    }),
    sub('Swashbuckler', XGTE, 'Dashing duellists.', {
      3 => [f('Fancy Footwork', 'Foes you attack cannot make opportunity attacks against you.'),
            f('Rakish Audacity', 'Add Charisma to initiative and Sneak Attack in one-on-one fights.')],
      9 => [f('Panache', 'Persuade or taunt creatures with charm.')],
      13 => [f('Elegant Maneuver', 'Advantage on Acrobatics and Athletics as a bonus action.')],
      17 => [f('Master Duelist', 'Reroll a missed attack with advantage.')],
    }),
    sub('Phantom', TCOE, 'Rogues touched by death.', {
      3 => [f('Whispers of the Dead', 'Gain a skill or tool from spirits each rest.'),
            f('Wails from the Grave', 'Sneak Attack also hurts a second creature.')],
      9 => [f('Tokens of the Departed', 'Collect soul trinkets for advantage and answers.')],
      13 => [f('Ghost Walk', 'Become spectral, flying through walls.')],
      17 => [f('Death\'s Friend', 'Wails from the Grave grows stronger.')],
    }),
    sub('Soulknife', TCOE, 'Rogues with psychic blades.', {
      3 => [f('Psionic Power', 'Psionic dice boost skills and telepathy.'),
            f('Psychic Blades', 'Manifest psychic blades to attack.')],
      9 => [f('Soul Blades', 'Blades can guide hits and teleport you.')],
      13 => [f('Psychic Veil', 'Become invisible.')],
      17 => [f('Rend Mind', 'Stun a creature with a Sneak Attack.')],
    }),
  ]

  BY_CLASS['sorcerer'] = [
    sub('Wild Magic', PHB, 'Magic that surges unpredictably.', {
      1 => [f('Wild Magic Surge', 'Spells can trigger random magical effects.'),
            f('Tides of Chaos', 'Gain advantage on a roll once per rest.')],
      6 => [f('Bend Luck', 'Spend sorcery points to change another creature\'s roll by a d4.')],
      14 => [f('Controlled Chaos', 'Roll twice for surges and choose.')],
      18 => [f('Spell Bombardment', 'Reroll and add maxed damage dice.')],
    }),
    sub('Divine Soul', XGTE, 'Sorcerers with a divine spark.', {
      1 => [f('Divine Magic', 'Learn cleric spells, plus a bonus spell from your affinity.'),
            f('Favored by the Gods', 'Add 2d4 to a failed save or missed attack.')],
      6 => [f('Empowered Healing', 'Reroll healing dice with sorcery points.')],
      14 => [f('Otherworldly Wings', 'Sprout wings and fly.')],
      18 => [f('Unearthly Recovery', 'Heal half your HP when badly hurt.')],
    }),
    sub('Shadow Magic', XGTE, 'Magic of the Shadowfell.', {
      1 => [f('Eyes of the Dark', 'Darkvision; cast darkness and see through it.'),
            f('Strength of the Grave', 'Stay at 1 HP instead of dropping.')],
      6 => [f('Hound of Ill Omen', 'Summon a shadowy hound to hunt a target.')],
      14 => [f('Shadow Walk', 'Teleport between shadows.')],
      18 => [f('Umbral Form', 'Become shadow, resisting damage and passing through objects.')],
    }),
    sub('Storm Sorcery', XGTE, 'Magic of wind and lightning.', {
      1 => [f('Wind Speaker', 'Speak Primordial.'),
            f('Tempestuous Magic', 'Fly briefly after casting.')],
      6 => [f('Heart of the Storm', 'Resist lightning and thunder; your spells shock nearby foes.'),
            f('Storm Guide', 'Control rain and wind.')],
      14 => [f('Storm\'s Fury', 'Shock and push melee attackers.')],
      18 => [f('Wind Soul', 'Immune to lightning and thunder; fly and share flight.')],
    }),
    sub('Aberrant Mind', TCOE, 'Power from alien influence.', {
      1 => [f('Psionic Spells', 'Extra psionic spells you can swap.'),
            f('Telepathic Speech', 'Speak telepathically with a creature.')],
      6 => [f('Psionic Sorcery', 'Cast psionic spells with sorcery points silently.'),
            f('Psychic Defenses', 'Resist psychic damage; advantage against charm and fear.')],
      14 => [f('Revelation in Flesh', 'Transform to see invisible, fly, swim or squeeze.')],
      18 => [f('Warping Implosion', 'Teleport and pull creatures in.')],
    }),
    sub('Clockwork Soul', TCOE, 'Power from the plane of order.', {
      1 => [f('Clockwork Magic', 'Extra spells of order you can swap.'),
            f('Restore Balance', 'Cancel advantage or disadvantage.')],
      6 => [f('Bastion of Law', 'Spend sorcery points to ward a creature.')],
      14 => [f('Trance of Order', 'Treat low rolls as 10.')],
      18 => [f('Clockwork Cavalcade', 'Heal, repair and end spells in an area.')],
    }),
  ]

  BY_CLASS['warlock'] = [
    sub('The Archfey', PHB, 'A pact with a lord or lady of the fey.', {
      1 => [f('Expanded Spell List', 'Extra fey spells to choose from.'),
            f('Fey Presence', 'Charm or frighten creatures around you.')],
      6 => [f('Misty Escape', 'Turn invisible and teleport when hurt.')],
      10 => [f('Beguiling Defenses', 'Immune to charm; turn charms back.')],
      14 => [f('Dark Delirium', 'Trap a creature in an illusory realm.')],
    }),
    sub('The Great Old One', PHB, 'A pact with an unknowable entity.', {
      1 => [f('Expanded Spell List', 'Extra mind-bending spells to choose from.'),
            f('Awakened Mind', 'Speak telepathically to creatures nearby.')],
      6 => [f('Entropic Ward', 'Impose disadvantage on an attack; gain advantage if it misses.')],
      10 => [f('Thought Shield', 'Resist psychic damage; your thoughts are guarded.')],
      14 => [f('Create Thrall', 'Charm an incapacitated humanoid indefinitely.')],
    }),
    sub('The Celestial', XGTE, 'A pact with a being of the upper planes.', {
      1 => [f('Expanded Spell List', 'Extra celestial spells to choose from.'),
            f('Bonus Cantrips', 'Light and sacred flame.'),
            f('Healing Light', 'Heal with a pool of d6s.')],
      6 => [f('Radiant Soul', 'Resist radiant; add Charisma to radiant and fire spells.')],
      10 => [f('Celestial Resilience', 'Give yourself and allies temporary HP after rests.')],
      14 => [f('Searing Vengeance', 'Rise from death\'s door in a burst of light.')],
    }),
    sub('The Hexblade', XGTE, 'A pact with a sentient weapon from the Shadowfell.', {
      1 => [f('Expanded Spell List', 'Extra hex spells to choose from.'),
            f('Hexblade\'s Curse', 'Curse a target for extra damage and criticals.'),
            f('Hex Warrior', 'Medium armour, shields, martial weapons; attack with Charisma.')],
      6 => [f('Accursed Specter', 'Raise a slain humanoid as a specter servant.')],
      10 => [f('Armor of Hexes', 'Make attacks from your cursed target miss.')],
      14 => [f('Master of Hexes', 'Move your curse when its target dies.')],
    }),
    sub('The Fathomless', TCOE, 'A pact with a power of the deep.', {
      1 => [f('Expanded Spell List', 'Extra ocean spells to choose from.'),
            f('Tentacle of the Deeps', 'Summon a tentacle that strikes and slows.'),
            f('Gift of the Sea', 'Swim and breathe underwater.')],
      6 => [f('Oceanic Soul', 'Resist cold; talk underwater.'),
            f('Guardian Coil', 'Your tentacle reduces damage to allies.')],
      10 => [f('Grasping Tentacles', 'Cast Evard\'s black tentacles and gain temporary HP.')],
      14 => [f('Fathomless Plunge', 'Teleport yourself and allies to water.')],
    }),
    sub('The Genie', TCOE, 'A pact with a noble genie.', {
      1 => [f('Expanded Spell List', 'Extra genie spells, based on genie kind.'),
            f('Genie\'s Vessel', 'A vessel you can rest inside; add elemental damage to hits.')],
      6 => [f('Elemental Gift', 'Resistance and flight.')],
      10 => [f('Sanctuary Vessel', 'Bring allies into your vessel for a rest.')],
      14 => [f('Limited Wish', 'Cast any short spell of 6th level or lower once in a while.')],
    }),
    sub('The Undying', SCAG, 'A pact with a being that defies death.', {
      1 => [f('Expanded Spell List', 'Extra death spells to choose from.'),
            f('Among the Dead', 'Learn spare the dying; undead are reluctant to attack you.')],
      6 => [f('Defy Death', 'Heal when you stabilise or succeed on a death save.')],
      10 => [f('Undying Nature', 'Need little air, food or sleep; age slowly.')],
      14 => [f('Indestructible Life', 'Heal yourself and reattach limbs as a bonus action.')],
    }),
  ]

  BY_CLASS['wizard'] = [
    sub('School of Abjuration', PHB, 'Masters of protective magic.', {
      2 => [f('Abjuration Savant', 'Copy abjuration spells cheaply.'),
            f('Arcane Ward', 'A magical ward absorbs damage.')],
      6 => [f('Projected Ward', 'Use your ward to protect allies.')],
      10 => [f('Improved Abjuration', 'Add proficiency to counterspell and dispel checks.')],
      14 => [f('Spell Resistance', 'Advantage on saves against spells; resist spell damage.')],
    }),
    sub('School of Conjuration', PHB, 'Masters of summoning and teleportation.', {
      2 => [f('Conjuration Savant', 'Copy conjuration spells cheaply.'),
            f('Minor Conjuration', 'Create a small object.')],
      6 => [f('Benign Transposition', 'Teleport or swap places with an ally.')],
      10 => [f('Focused Conjuration', 'Damage cannot break your conjuration concentration.')],
      14 => [f('Durable Summons', 'Your summons gain temporary HP.')],
    }),
    sub('School of Divination', PHB, 'Seers who glimpse the future.', {
      2 => [f('Divination Savant', 'Copy divination spells cheaply.'),
            f('Portent', 'Roll two d20s each day to replace any rolls you see.')],
      6 => [f('Expert Divination', 'Divination spells refund a lower slot.')],
      10 => [f('The Third Eye', 'Gain darkvision, see the ethereal, read any language or see invisible.')],
      14 => [f('Greater Portent', 'Roll three Portent dice.')],
    }),
    sub('School of Enchantment', PHB, 'Masters of charm and influence.', {
      2 => [f('Enchantment Savant', 'Copy enchantment spells cheaply.'),
            f('Hypnotic Gaze', 'Charm and stun a creature by holding its gaze.')],
      6 => [f('Instinctive Charm', 'Redirect an attacker to another target.')],
      10 => [f('Split Enchantment', 'Single-target enchantments affect two creatures.')],
      14 => [f('Alter Memories', 'Make a charmed creature forget being charmed.')],
    }),
    sub('School of Illusion', PHB, 'Masters of deception.', {
      2 => [f('Illusion Savant', 'Copy illusion spells cheaply.'),
            f('Improved Minor Illusion', 'Minor illusion makes sound and image together.')],
      6 => [f('Malleable Illusions', 'Change your illusions as an action.')],
      10 => [f('Illusory Self', 'An illusion makes an attack miss.')],
      14 => [f('Illusory Reality', 'Make part of an illusion real.')],
    }),
    sub('School of Necromancy', PHB, 'Masters of life and death.', {
      2 => [f('Necromancy Savant', 'Copy necromancy spells cheaply.'),
            f('Grim Harvest', 'Heal when your spells kill.')],
      6 => [f('Undead Thralls', 'Raise more and stronger undead.')],
      10 => [f('Inured to Undeath', 'Resist necrotic damage; your HP maximum cannot be lowered.')],
      14 => [f('Command Undead', 'Take control of undead creatures.')],
    }),
    sub('School of Transmutation', PHB, 'Masters of changing matter.', {
      2 => [f('Transmutation Savant', 'Copy transmutation spells cheaply.'),
            f('Minor Alchemy', 'Temporarily change what an object is made of.')],
      6 => [f('Transmuter\'s Stone', 'Create a stone that grants a benefit.')],
      10 => [f('Shapechanger', 'Cast polymorph on yourself without a slot.')],
      14 => [f('Master Transmuter', 'Destroy your stone for a major effect.')],
    }),
    sub('War Magic', XGTE, 'Wizards trained for battle.', {
      2 => [f('Arcane Deflection', 'Boost AC or a save as a reaction.'),
            f('Tactical Wit', 'Add Intelligence to initiative.')],
      6 => [f('Power Surge', 'Store surges to add force damage to spells.')],
      10 => [f('Durable Magic', 'Bonus to AC and saves while concentrating.')],
      14 => [f('Deflecting Shroud', 'Arcane Deflection damages nearby foes.')],
    }),
    sub('Bladesinging', TCOE, 'Elegant sword-wielding wizards.', {
      2 => [f('Training in War and Song', 'Light armour, a one-handed weapon and Performance.'),
            f('Bladesong', 'Gain speed, AC and concentration bonuses.')],
      6 => [f('Extra Attack', 'Attack twice; replace one attack with a cantrip.')],
      10 => [f('Song of Defense', 'Spend slots to reduce damage.')],
      14 => [f('Song of Victory', 'Add Intelligence to melee damage while singing.')],
    }),
    sub('Order of Scribes', TCOE, 'Wizards bound to an awakened spellbook.', {
      2 => [f('Wizardly Quill', 'A magical quill for fast spell copying.'),
            f('Awakened Spellbook', 'Change spell damage types and cast rituals quickly.')],
      6 => [f('Manifest Mind', 'Cast spells through a ghostly projection of your book.')],
      10 => [f('Master Scrivener', 'Make powerful scrolls.')],
      14 => [f('One with the Word', 'Your book protects you from damage.')],
    }),
    sub('Chronurgy Magic', EGTW, 'Wizards who bend time.', {
      2 => [f('Chronal Shift', 'Force a creature to reroll.'),
            f('Temporal Awareness', 'Add Intelligence to initiative.')],
      6 => [f('Momentary Stasis', 'Freeze a creature in time.')],
      10 => [f('Arcane Abeyance', 'Store a spell in a bead to use later.')],
      14 => [f('Convergent Future', 'Decide whether a roll succeeds, at a cost.')],
    }),
    sub('Graviturgy Magic', EGTW, 'Wizards who bend gravity.', {
      2 => [f('Adjust Density', 'Make a creature lighter or heavier.')],
      6 => [f('Gravity Well', 'Move creatures hit by your spells.')],
      10 => [f('Violent Attraction', 'Increase damage from attacks or falls.')],
      14 => [f('Event Horizon', 'Pull and slow creatures around you.')],
    }),
  ]
end
