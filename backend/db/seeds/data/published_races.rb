# Published 5e races that are NOT in the open-licensed SRD.
#
# Only the game numbers (speed, size, ability bonuses, languages) and
# short trait summaries written for twinSoul are stored here. The books'
# own text is copyrighted by Wizards of the Coast, so DO NOT paste it in.
# Keep every `desc` a brief, original paraphrase of what the trait does.
#
# Uses the original (pre-2024) versions with fixed ability bonuses, to
# match the SRD 5.1 races. Races whose source book gives a free choice of
# bonuses have no fixed `ability_bonuses` and explain it in a trait.

module PublishedRaces
  module_function

  def slug(text)
    text.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-|-\z/, '')
  end

  def t(name, *desc)
    { 'index' => slug(name), 'name' => name, 'desc' => desc }
  end

  def asi(**bonuses)
    bonuses.map { |ability, bonus| { 'ability_score' => ability.to_s, 'bonus' => bonus } }
  end

  def sub(name, desc, bonuses, traits)
    { 'index' => slug(name), 'name' => name, 'desc' => desc, 'ability_bonuses' => bonuses, 'racial_traits' => traits }
  end

  def race(name, source:, speed: 30, size: 'Medium', bonuses: [], languages: ['Common'], traits: [], subraces: [], blurb: nil)
    {
      'index' => slug(name),
      'name' => name,
      'source' => source,
      'speed' => speed,
      'size' => size,
      'size_description' => '',
      'age' => '',
      'alignment' => '',
      'language_desc' => "You know #{languages.join(', ')}.",
      'languages' => languages,
      'ability_bonuses' => bonuses,
      'traits' => traits,
      'subraces' => subraces,
      'description' => blurb,
    }
  end

  DARKVISION = t('Darkvision', 'You see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light (shades of gray only).')
  POWERFUL_BUILD = t('Powerful Build', 'You count as one size larger when working out your carrying capacity and the weight you can push, drag, or lift.')
  FLEX_ASI = t('Ability Score Increase', 'Raise one ability score by 2 and a different one by 1, or raise three different scores by 1 each. Add these on the ability scores step.')
  FEY = t('Fey', 'Your creature type is Fey rather than Humanoid.')

  VOLO = "Volo's Guide to Monsters"
  EEPC = "Elemental Evil Player's Companion"
  MTOF = "Mordenkainen's Tome of Foes"
  ERLW = 'Eberron: Rising from the Last War'
  GGTR = "Guildmasters' Guide to Ravnica"
  MOOT = 'Mythic Odysseys of Theros'
  WBTW = 'The Wild Beyond the Witchlight'
  SCOC = 'Strixhaven: A Curriculum of Chaos'

  ALL = [
    race('Aarakocra', source: EEPC, speed: 25, bonuses: asi(dex: 2, wis: 1), languages: %w[Common Aarakocra Auran],
      blurb: 'Bird-folk from the high peaks of the Elemental Plane of Air.',
      traits: [
        t('Flight', 'You have a flying speed of 50 feet, but not while wearing medium or heavy armor.'),
        t('Talons', 'Your unarmed strikes can deal 1d4 slashing damage.'),
      ]),

    race('Aasimar', source: VOLO, bonuses: asi(cha: 2), languages: %w[Common Celestial],
      blurb: 'Mortals touched by celestial power and guided by an angelic voice.',
      traits: [
        DARKVISION,
        t('Celestial Resistance', 'You resist necrotic and radiant damage.'),
        t('Healing Hands', 'As an action, touch a creature to restore hit points equal to your level. Once per long rest.'),
        t('Light Bearer', 'You know the light cantrip (Charisma is your casting ability).'),
      ],
      subraces: [
        sub('Protector Aasimar', 'Charged by the powers of good to guard the weak.', asi(wis: 1), [
          t('Radiant Soul', 'From 3rd level, as an action you can sprout spectral wings for 1 minute: fly 30 feet, and once per turn deal extra radiant damage equal to your level. Once per long rest.'),
        ]),
        sub('Scourge Aasimar', 'Filled with a burning divine energy.', asi(con: 1), [
          t('Radiant Consumption', 'From 3rd level, as an action you can blaze with light for 1 minute, scorching yourself and nearby creatures each turn and adding radiant damage to one hit per turn. Once per long rest.'),
        ]),
        sub('Fallen Aasimar', 'Touched by dark power, or turned away from the light.', asi(str: 1), [
          t('Necrotic Shroud', 'From 3rd level, as an action you can reveal a dreadful form for 1 minute; nearby creatures may be frightened, and one hit per turn deals extra necrotic damage. Once per long rest.'),
        ]),
      ]),

    race('Bugbear', source: VOLO, bonuses: asi(str: 2, dex: 1), languages: %w[Common Goblin],
      blurb: 'Large, hairy goblinoids that are surprisingly stealthy.',
      traits: [
        DARKVISION,
        t('Long-Limbed', 'On your turn, your melee attacks reach 5 feet further than normal.'),
        POWERFUL_BUILD,
        t('Sneaky', 'You are proficient in Stealth.'),
        t('Surprise Attack', 'In the first round of combat, hitting a surprised creature deals an extra 2d6 damage (once per combat).'),
      ]),

    race('Centaur', source: GGTR, speed: 40, bonuses: asi(str: 2, wis: 1), languages: %w[Common Sylvan],
      blurb: 'Swift, horse-bodied wanderers of the wilds.',
      traits: [
        FEY,
        t('Charge', 'If you move at least 30 feet straight toward a target and hit it with a melee weapon, you can kick it with your hooves as a bonus action.'),
        t('Hooves', 'Your hooves are a natural weapon dealing 1d4 bludgeoning damage.'),
        t('Equine Build', 'You count as one size larger for carrying capacity, and climbing costs you 4 extra feet per foot moved.'),
        t('Survivor', 'Gain proficiency in one of Animal Handling, Medicine, Nature, or Survival.'),
      ]),

    race('Changeling', source: ERLW, bonuses: asi(cha: 2), languages: %w[Common],
      blurb: 'Shapechangers who can take on any face they like.',
      traits: [
        t('Ability Score Increase', 'Also raise one other ability score of your choice by 1 on the ability scores step.'),
        t('Shapechanger', 'As an action, change your appearance and voice to that of a Medium or Small humanoid you have seen, or to a new face. Your gear does not change.'),
        t('Changeling Instincts', 'Gain proficiency in two of Deception, Insight, Intimidation, and Persuasion.'),
        t('Extra Languages', 'You know two more languages of your choice.'),
      ]),

    race('Firbolg', source: VOLO, bonuses: asi(wis: 2, str: 1), languages: %w[Common Elvish Giant],
      blurb: 'Gentle forest giants who prefer to stay hidden.',
      traits: [
        t('Firbolg Magic', 'Cast detect magic and disguise self (which can make you look up to 3 feet shorter) once each per short rest, using Wisdom.'),
        t('Hidden Step', 'As a bonus action, turn invisible until the start of your next turn or until you attack or cast a spell. Once per short rest.'),
        POWERFUL_BUILD,
        t('Speech of Beast and Leaf', 'Beasts and plants can understand the meaning of your words in a limited way, and you have advantage on Charisma checks to influence them.'),
      ]),

    race('Genasi', source: EEPC, bonuses: asi(con: 2), languages: %w[Common Primordial],
      blurb: 'People with elemental blood from the inner planes.',
      subraces: [
        sub('Air Genasi', 'Descended from the djinn.', asi(dex: 1), [
          t('Unending Breath', 'You can hold your breath indefinitely while not incapacitated.'),
          t('Mingle with the Wind', 'Cast levitate on yourself once per long rest, using Constitution.'),
        ]),
        sub('Earth Genasi', 'Descended from the dao.', asi(str: 1), [
          t('Earth Walk', 'Difficult terrain made of earth or stone costs you no extra movement.'),
          t('Merge with Stone', 'Cast pass without trace once per long rest, using Constitution.'),
        ]),
        sub('Fire Genasi', 'Descended from the efreet.', asi(int: 1), [
          DARKVISION,
          t('Fire Resistance', 'You resist fire damage.'),
          t('Reach to the Blaze', 'You know produce flame; from 3rd level you can cast burning hands once per long rest. Constitution is your casting ability.'),
        ]),
        sub('Water Genasi', 'Descended from the marids.', asi(wis: 1), [
          t('Acid Resistance', 'You resist acid damage.'),
          t('Amphibious', 'You can breathe air and water.'),
          t('Swim', 'You have a swimming speed of 30 feet.'),
          t('Call to the Wave', 'You know shape water; from 3rd level you can cast create or destroy water once per long rest. Constitution is your casting ability.'),
        ]),
      ]),

    race('Gith', source: MTOF, bonuses: asi(int: 1), languages: %w[Common Gith],
      blurb: 'Former thralls of the mind flayers, now split into two rival peoples.',
      subraces: [
        sub('Githyanki', 'Warrior raiders of the Astral Plane.', asi(str: 2), [
          t('Decadent Mastery', 'Learn one language and gain proficiency with one skill or tool.'),
          t('Martial Prodigy', 'You are proficient with light and medium armor, shortswords, longswords, and greatswords.'),
          t('Githyanki Psionics', 'You know mage hand (the hand is invisible). At 3rd level cast jump, and at 5th misty step, each once per long rest. Intelligence is your casting ability.'),
        ]),
        sub('Githzerai', 'Disciplined monks of Limbo.', asi(wis: 2), [
          t('Mental Discipline', 'You have advantage on saves against being charmed or frightened.'),
          t('Githzerai Psionics', 'You know mage hand (the hand is invisible). At 3rd level cast shield, and at 5th detect thoughts, each once per long rest. Wisdom is your casting ability.'),
        ]),
      ]),

    race('Goblin', source: VOLO, size: 'Small', bonuses: asi(dex: 2, con: 1), languages: %w[Common Goblin],
      blurb: 'Small, quick and scrappy goblinoids.',
      traits: [
        DARKVISION,
        t('Fury of the Small', 'When you damage a creature larger than you, add your level to the damage. Once per short rest.'),
        t('Nimble Escape', 'You can Disengage or Hide as a bonus action.'),
      ]),

    race('Goliath', source: VOLO, bonuses: asi(str: 2, con: 1), languages: %w[Common Giant],
      blurb: 'Towering, competitive mountain dwellers.',
      traits: [
        t('Natural Athlete', 'You are proficient in Athletics.'),
        t("Stone's Endurance", 'When you take damage, use your reaction to reduce it by 1d12 + your Constitution modifier. Once per short rest.'),
        POWERFUL_BUILD,
        t('Mountain Born', 'You resist cold damage and are used to high altitudes.'),
      ]),

    race('Grung', source: 'One Grung Above', size: 'Small', speed: 25, bonuses: asi(dex: 2, con: 1), languages: %w[Grung],
      blurb: 'Brightly coloured, poisonous frog-folk.',
      traits: [
        t('Arboreal Alertness', 'You are proficient in Perception.'),
        t('Amphibious', 'You can breathe air and water.'),
        t('Climbing', 'You have a climbing speed of 25 feet.'),
        t('Poison Immunity', 'You are immune to poison damage and the poisoned condition.'),
        t('Poisonous Skin', 'Creatures that grapple you or touch your skin risk being poisoned, and you can coat a piercing weapon in your poison.'),
        t('Standing Leap', 'You can long jump up to 25 feet and high jump up to 15 feet, with or without a run-up.'),
        t('Water Dependency', 'You must immerse yourself in water for an hour each day or suffer exhaustion.'),
      ]),

    race('Hobgoblin', source: VOLO, bonuses: asi(con: 2, int: 1), languages: %w[Common Goblin],
      blurb: 'Disciplined, militaristic goblinoids.',
      traits: [
        DARKVISION,
        t('Martial Training', 'You are proficient with two martial weapons of your choice and with light armor.'),
        t('Saving Face', 'When you miss an attack or fail a check or save, add a bonus equal to the number of allies you can see within 30 feet (max +5). Once per short rest.'),
      ]),

    race('Kalashtar', source: ERLW, bonuses: asi(wis: 2, cha: 1), languages: %w[Common Quori],
      blurb: 'Humans bound to spirits from the plane of dreams.',
      traits: [
        t('Dual Mind', 'You have advantage on Wisdom saving throws.'),
        t('Mental Discipline', 'You resist psychic damage.'),
        t('Mind Link', 'You can speak telepathically to a creature you can see within 10 feet × your level.'),
        t('Severed from Dreams', 'You dream only your spirit\'s memories, and magic that targets dreams cannot affect you.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Kenku', source: VOLO, bonuses: asi(dex: 2, wis: 1), languages: %w[Common Auran],
      blurb: 'Flightless bird-folk who speak only by mimicking sounds.',
      traits: [
        t('Expert Forgery', 'You have advantage on checks to copy writing, craftwork, or other objects.'),
        t('Kenku Training', 'Gain proficiency in two of Acrobatics, Deception, Stealth, and Sleight of Hand.'),
        t('Mimicry', 'You can imitate sounds and voices you have heard. A listener needs a successful Insight check to tell they are fake. You speak only through mimicry.'),
      ]),

    race('Kobold', source: VOLO, size: 'Small', bonuses: asi(dex: 2, str: -2), languages: %w[Common Draconic],
      blurb: 'Small reptilian folk who honour dragons.',
      traits: [
        DARKVISION,
        t('Grovel, Cower, and Beg', 'As an action, distract foes so allies within 10 feet of you have advantage on attacks against enemies near you until your next turn. Once per short rest.'),
        t('Pack Tactics', 'You have advantage on attacks against a creature when an ally is within 5 feet of it and not incapacitated.'),
        t('Sunlight Sensitivity', 'You have disadvantage on attacks and sight-based Perception checks in direct sunlight.'),
      ]),

    race('Leonin', source: MOOT, speed: 35, bonuses: asi(con: 2, str: 1), languages: %w[Common Leonin],
      blurb: 'Proud lion-folk of the plains.',
      traits: [
        DARKVISION,
        t('Claws', 'Your unarmed strikes can deal 1d4 slashing damage.'),
        t("Hunter's Instincts", 'Gain proficiency in one of Athletics, Intimidation, Perception, or Survival.'),
        t('Daunting Roar', 'As a bonus action, roar: creatures of your choice within 10 feet must pass a Wisdom save or be frightened of you until the end of your next turn. Once per short rest.'),
      ]),

    race('Lizardfolk', source: VOLO, bonuses: asi(con: 2, wis: 1), languages: %w[Common Draconic],
      blurb: 'Cold-blooded, pragmatic swamp hunters.',
      traits: [
        t('Bite', 'Your bite is a natural weapon dealing 1d6 piercing damage.'),
        t('Cunning Artisan', 'After a short rest you can craft a shield or simple weapon from the bones and hide of a creature you killed.'),
        t('Hold Breath', 'You can hold your breath for up to 15 minutes.'),
        t('Swim', 'You have a swimming speed of 30 feet.'),
        t("Hunter's Lore", 'Gain proficiency in two of Animal Handling, Nature, Perception, Stealth, and Survival.'),
        t('Natural Armor', 'Without armor, your AC is 13 + your Dexterity modifier. A shield still adds its bonus.'),
        t('Hungry Jaws', 'As a bonus action, bite a creature; if it hits you gain temporary hit points equal to your Constitution modifier. Once per short rest.'),
      ]),

    race('Locathah', source: 'Locathah Rising', bonuses: asi(str: 2, dex: 1), languages: %w[Aquan Common],
      blurb: 'Fish-folk who fought their way free of servitude.',
      traits: [
        t('Natural Armor', 'Without armor, your AC is 12 + your Dexterity modifier. A shield still adds its bonus.'),
        t('Observant & Athletic', 'You are proficient in Athletics and Perception.'),
        t('Leviathan Will', 'You have advantage on saves against being charmed, frightened, paralyzed, poisoned, stunned, or put to sleep.'),
        t('Swim', 'You have a swimming speed of 30 feet.'),
        t('Limited Amphibiousness', 'You breathe air and water, but must submerge at least once every 4 hours or start suffocating.'),
      ]),

    race('Loxodon', source: GGTR, bonuses: asi(con: 2, wis: 1), languages: %w[Common Loxodon],
      blurb: 'Calm, elephant-like people with long memories.',
      traits: [
        POWERFUL_BUILD,
        t('Loxodon Serenity', 'You have advantage on saves against being charmed or frightened.'),
        t('Natural Armor', 'Without armor, your AC is 12 + your Constitution modifier. A shield still adds its bonus.'),
        t('Trunk', 'Your trunk can grab, lift and carry light things, reach 5 feet, and work as a snorkel. It cannot wield weapons or shields.'),
        t('Keen Smell', 'You have advantage on Perception, Investigation and Survival checks that rely on smell.'),
      ]),

    race('Minotaur', source: GGTR, bonuses: asi(str: 2, con: 1), languages: %w[Common Minotaur],
      blurb: 'Horned, powerful warriors.',
      traits: [
        t('Horns', 'Your horns are a natural weapon dealing 1d6 piercing damage.'),
        t('Goring Rush', 'Right after you Dash and move at least 20 feet, you can make a horn attack as a bonus action.'),
        t('Hammering Horns', 'After hitting with a melee attack during the Attack action, you can try to shove that creature 10 feet as a bonus action.'),
        t('Imposing Presence', 'Gain proficiency in Intimidation or Persuasion.'),
      ]),

    race('Orc', source: VOLO, bonuses: asi(str: 2, con: 1, int: -2), languages: %w[Common Orc],
      blurb: 'Fierce, strong and relentless raiders.',
      traits: [
        DARKVISION,
        t('Aggressive', 'As a bonus action, move up to your speed toward a hostile creature you can see.'),
        t('Menacing', 'You are proficient in Intimidation.'),
        POWERFUL_BUILD,
      ]),

    race('Satyr', source: MOOT, speed: 35, bonuses: asi(cha: 2, dex: 1), languages: %w[Common Sylvan],
      blurb: 'Fun-loving goat-legged fey.',
      traits: [
        FEY,
        t('Ram', 'Your head can make unarmed strikes dealing 1d4 bludgeoning damage.'),
        t('Magic Resistance', 'You have advantage on saving throws against spells.'),
        t('Mirthful Leaps', 'Add 1d8 feet to your long or high jumps.'),
        t('Reveler', 'You are proficient in Performance and Persuasion, and with one musical instrument.'),
      ]),

    race('Shifter', source: ERLW, languages: %w[Common],
      blurb: 'Descendants of lycanthropes who can bring out their bestial side.',
      traits: [
        DARKVISION,
        t('Shifting', 'As a bonus action, shift for 1 minute and gain temporary hit points equal to your level + Constitution modifier (minimum 1). Your subrace adds another effect. Once per short rest.'),
      ],
      subraces: [
        sub('Beasthide', 'Tough as a bear or boar.', asi(con: 2, str: 1), [
          t('Natural Athlete', 'You are proficient in Athletics.'),
          t('Shifting Feature', 'While shifted, gain an extra 1d6 temporary hit points and +1 AC.'),
        ]),
        sub('Longtooth', 'Fierce as a wolf.', asi(str: 2, dex: 1), [
          t('Fierce', 'You are proficient in Intimidation.'),
          t('Shifting Feature', 'While shifted, bite as a bonus action for 1d6 + Strength piercing damage.'),
        ]),
        sub('Swiftstride', 'Quick as a cat.', asi(dex: 2, cha: 1), [
          t('Graceful', 'You are proficient in Acrobatics.'),
          t('Shifting Feature', 'While shifted, your speed rises by 10 feet, and you can move 10 feet as a reaction when an enemy ends its turn next to you.'),
        ]),
        sub('Wildhunt', 'Keen as a hunting hound.', asi(wis: 2, dex: 1), [
          t('Natural Tracker', 'You are proficient in Survival.'),
          t('Shifting Feature', 'While shifted, you have advantage on Wisdom checks and nobody near you can gain advantage on attacks against you.'),
        ]),
      ]),

    race('Simic Hybrid', source: GGTR, bonuses: asi(con: 2), languages: %w[Common],
      blurb: 'People enhanced with animal traits by Simic biomancers.',
      traits: [
        t('Ability Score Increase', 'Also raise one other ability score of your choice by 1 on the ability scores step.'),
        DARKVISION,
        t('Animal Enhancement (1st level)', 'Choose one: Manta Glide (glide and fall slowly), Nimble Climber (climbing speed equal to your speed), or Underwater Adaptation (breathe water, swimming speed equal to your speed).'),
        t('Animal Enhancement (5th level)', 'Choose another: one from the 1st-level list, or Grappling Appendages, Carapace (+1 AC without heavy armor), or Acid Spit.'),
        t('Extra Language', 'You also know Elvish or Vedalken.'),
      ]),

    race('Tabaxi', source: VOLO, bonuses: asi(dex: 2, cha: 1), languages: %w[Common],
      blurb: 'Curious cat-folk wanderers.',
      traits: [
        DARKVISION,
        t('Feline Agility', 'When you move on your turn, you can double your speed until the end of the turn. You can do this again after a turn in which you do not move.'),
        t("Cat's Claws", 'You have a climbing speed of 20 feet, and your claws deal 1d4 slashing damage as unarmed strikes.'),
        t("Cat's Talent", 'You are proficient in Perception and Stealth.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Tortle', source: 'The Tortle Package', bonuses: asi(str: 2, wis: 1), languages: %w[Aquan Common],
      blurb: 'Turtle-folk who carry their homes on their backs.',
      traits: [
        t('Claws', 'Your unarmed strikes can deal 1d4 slashing damage.'),
        t('Hold Breath', 'You can hold your breath for up to 1 hour.'),
        t('Natural Armor', 'Your shell gives you a base AC of 17; you cannot wear armor, but a shield still adds its bonus.'),
        t('Shell Defense', 'As an action, withdraw into your shell for +4 AC and advantage on Strength and Constitution saves, but you are prone and cannot move or react. Leave it as a bonus action.'),
        t('Survival Instinct', 'You are proficient in Survival.'),
      ]),

    race('Triton', source: VOLO, bonuses: asi(str: 1, con: 1, cha: 1), languages: %w[Common Primordial],
      blurb: 'Guardians of the deep ocean.',
      traits: [
        t('Amphibious', 'You can breathe air and water.'),
        t('Swim', 'You have a swimming speed of 30 feet.'),
        t('Control Air and Water', 'Cast fog cloud; from 3rd level gust of wind, and from 5th wall of water, each once per long rest. Charisma is your casting ability.'),
        t('Emissary of the Sea', 'You can share simple ideas with beasts that breathe water.'),
        t('Guardians of the Depths', 'You resist cold damage and ignore the hazards of deep water.'),
      ]),

    race('Vedalken', source: GGTR, bonuses: asi(int: 2, wis: 1), languages: %w[Common Vedalken],
      blurb: 'Calm, curious blue-skinned seekers of perfection.',
      traits: [
        t('Vedalken Dispassion', 'You have advantage on Intelligence, Wisdom, and Charisma saving throws.'),
        t('Tireless Precision', 'Gain proficiency in one of Arcana, History, Investigation, Medicine, Performance, or Sleight of Hand, and with one tool. Add 1d4 to checks with them.'),
        t('Partially Amphibious', 'You can breathe underwater for up to 1 hour, once per long rest.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Verdan', source: 'Acquisitions Incorporated', size: 'Small', bonuses: asi(cha: 2, con: 1), languages: %w[Common Goblin],
      blurb: 'Goblin-descended people still growing into their new nature.',
      traits: [
        t('Black Blood Healing', 'When you roll a 1 or 2 on a Hit Die during a rest, you can reroll it and must use the new roll.'),
        t('Limited Telepathy', 'You can send simple telepathic messages to a creature within 30 feet.'),
        t('Persuasive', 'You are proficient in Persuasion.'),
        t('Telepathic Insight', 'You have advantage on Wisdom and Charisma saving throws.'),
        t('Growth', 'At 5th level you grow from Small to Medium.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Warforged', source: ERLW, bonuses: asi(con: 2), languages: %w[Common],
      blurb: 'Living constructs built for war.',
      traits: [
        t('Ability Score Increase', 'Also raise one other ability score of your choice by 1 on the ability scores step.'),
        t('Constructed Resilience', 'You have advantage on saves against poison and resist poison damage, do not need to eat, drink or breathe, are immune to disease, and cannot be magically put to sleep.'),
        t("Sentry's Rest", 'You take a long rest by staying inactive but aware for 6 hours.'),
        t('Integrated Protection', 'You gain +1 AC. Armor you wear becomes part of you and takes an hour to put on or take off.'),
        t('Specialized Design', 'Gain proficiency in one skill and one tool of your choice.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Yuan-ti Pureblood', source: VOLO, bonuses: asi(cha: 2, int: 1), languages: %w[Common Abyssal Draconic],
      blurb: 'Serpent-blooded humans who can pass as ordinary people.',
      traits: [
        DARKVISION,
        t('Innate Spellcasting', 'You know poison spray and can cast animal friendship on snakes at will; from 3rd level you can cast suggestion once per long rest. Charisma is your casting ability.'),
        t('Magic Resistance', 'You have advantage on saving throws against spells and other magical effects.'),
        t('Poison Immunity', 'You are immune to poison damage and the poisoned condition.'),
      ]),

    race('Fairy', source: WBTW, size: 'Small', languages: %w[Common],
      blurb: 'Tiny winged fey from the Feywild.',
      traits: [
        FLEX_ASI,
        FEY,
        t('Flight', 'You have a flying speed equal to your walking speed, but not while wearing medium or heavy armor.'),
        t('Fairy Magic', 'You know druidcraft. At 3rd level cast faerie fire, and at 5th enlarge/reduce, each once per long rest.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Harengon', source: WBTW, languages: %w[Common],
      blurb: 'Quick, lucky rabbit-folk.',
      traits: [
        FLEX_ASI,
        t('Hare-Trigger', 'Add your proficiency bonus to initiative rolls.'),
        t('Leporine Senses', 'You are proficient in Perception.'),
        t('Lucky Footwork', 'When you fail a Dexterity save, use your reaction to add 1d4 to the roll.'),
        t('Rabbit Hop', 'As a bonus action, jump a number of feet equal to 5 × your proficiency bonus without provoking opportunity attacks. Uses equal your proficiency bonus per long rest.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),

    race('Owlin', source: SCOC, languages: %w[Common],
      blurb: 'Silent, owl-like people.',
      traits: [
        FLEX_ASI,
        t('Darkvision', 'You see in dim light within 120 feet as if it were bright light, and in darkness as if it were dim light.'),
        t('Flight', 'You have a flying speed equal to your walking speed, but not while wearing medium or heavy armor.'),
        t('Silent Feathers', 'You are proficient in Stealth.'),
        t('Extra Language', 'You know one more language of your choice.'),
      ]),
  ].freeze
end
