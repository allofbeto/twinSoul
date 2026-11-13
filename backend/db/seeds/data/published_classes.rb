# Published classes that are not in the SRD (Artificer, Blood Hunter).
# Same rule as the other published data: game numbers plus short summaries
# written for twinSoul. Never paste the source books' text here.

require_relative 'published_subclasses'

module PublishedClasses
  module_function

  f = PublishedSubclasses.method(:f)
  sub = PublishedSubclasses.method(:sub)

  ASI_LEVELS = [4, 8, 12, 16, 19].freeze

  def prof_bonus(level)
    ((level - 1) / 4) + 2
  end

  def skill_choice(count, names)
    {
      'desc' => "Choose #{count} from #{names.join(', ')}",
      'type' => 'proficiencies',
      'choose' => count,
      'from' => {
        'option_set_type' => 'options_array',
        'options' => names.map do |n|
          { 'option_type' => 'reference', 'item' => { 'index' => "skill-#{PublishedSubclasses.slug(n)}", 'name' => "Skill: #{n}" } }
        end,
      },
    }
  end

  def score(ability, min = 13)
    { 'ability_score' => { 'index' => ability, 'name' => ability.upcase }, 'minimum_score' => min }
  end

  # features: { level => [feature, ...] }; spell_slots: { level => [1st, 2nd, ...] }
  def levels(features:, spell_slots: {}, cantrips: {}, specific: ->(_l) { {} })
    (1..20).map do |lvl|
      slots = spell_slots[lvl]
      spellcasting =
        if slots
          base = { 'cantrips_known' => cantrips[lvl] }.compact
          (1..9).each { |n| base["spell_slots_level_#{n}"] = slots[n - 1] || 0 }
          base
        end
      {
        'level' => lvl,
        'prof_bonus' => prof_bonus(lvl),
        'ability_score_bonuses' => ASI_LEVELS.count { |l| l <= lvl },
        'features' => features[lvl] || [],
        'spellcasting' => spellcasting,
        'class_specific' => specific.call(lvl),
      }
    end
  end

  ASI = ->(f) { f.call('Ability Score Improvement', 'Raise one ability by 2 or two by 1, or take a feat.') }.call(f)

  # Half caster that rounds up (starts casting at 1st level).
  ARTIFICER_SLOTS = {
    1 => [2], 2 => [2], 3 => [3], 4 => [3], 5 => [4, 2], 6 => [4, 2], 7 => [4, 3], 8 => [4, 3],
    9 => [4, 3, 2], 10 => [4, 3, 2], 11 => [4, 3, 3], 12 => [4, 3, 3], 13 => [4, 3, 3, 1], 14 => [4, 3, 3, 1],
    15 => [4, 3, 3, 2], 16 => [4, 3, 3, 2], 17 => [4, 3, 3, 3, 1], 18 => [4, 3, 3, 3, 1], 19 => [4, 3, 3, 3, 2], 20 => [4, 3, 3, 3, 2],
  }.freeze

  ARTIFICER = {
    'index' => 'artificer',
    'name' => 'Artificer',
    'source' => "Tasha's Cauldron of Everything",
    'description' => 'Inventors who channel magic through tools and infused items.',
    'hit_die' => 8,
    'proficiencies' => ['Light armor', 'Medium armor', 'Shields', 'Simple weapons', "Thieves' tools", "Tinker's tools", "One artisan's tool"],
    'proficiency_choices' => [skill_choice(2, ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'])],
    'saving_throws' => %w[con int],
    'spellcasting_ability' => 'int',
    'spellcasting_info' => [{ 'name' => 'Spellcasting', 'desc' => ['Prepare artificer spells using Intelligence; you need tools in hand as a focus.'] }],
    'multi_classing' => { 'prerequisites' => [score('int')] },
    'subclass_choice_level' => 3,
    'starting_equipment' => [],
    'starting_equipment_options' => [],
    'levels' => levels(
      spell_slots: ARTIFICER_SLOTS,
      cantrips: (1..20).to_h { |l| [l, l >= 14 ? 4 : l >= 10 ? 3 : 2] },
      specific: lambda { |l|
        infusions = l >= 18 ? 12 : l >= 14 ? 10 : l >= 10 ? 8 : l >= 6 ? 6 : l >= 2 ? 4 : 0
        items = l >= 18 ? 6 : l >= 14 ? 5 : l >= 10 ? 4 : l >= 6 ? 3 : l >= 2 ? 2 : 0
        { 'infusions_known' => infusions, 'infused_items' => items }
      },
      features: {
        1 => [f.call('Magical Tinkering', 'Give tiny objects small magical properties like light, sound or a message.'),
              f.call('Spellcasting', 'Cast artificer spells with Intelligence, using tools as your focus.')],
        2 => [f.call('Infuse Item', 'Turn mundane items into magic items with infusions you know.')],
        3 => [f.call('Artificer Specialist', 'Choose your specialism.'),
              f.call('The Right Tool for the Job', "Create a set of artisan's tools during a rest.")],
        4 => [ASI],
        6 => [f.call('Tool Expertise', 'Double proficiency on checks with tools.')],
        7 => [f.call('Flash of Genius', 'Add Intelligence to a nearby creature\'s check or save as a reaction.')],
        8 => [ASI],
        10 => [f.call('Magic Item Adept', 'Attune to four items and craft common and uncommon items faster.')],
        11 => [f.call('Spell-Storing Item', 'Store a low-level spell in an item for others to use.')],
        12 => [ASI],
        14 => [f.call('Magic Item Savant', 'Attune to five items and ignore class, race and level requirements.')],
        16 => [ASI],
        18 => [f.call('Magic Item Master', 'Attune to six items.')],
        19 => [ASI],
        20 => [f.call('Soul of Artifice', 'Bonus to saves per attuned item; end an attunement to avoid dropping to 0 HP.')],
      }
    ),
    'subclasses' => [
      sub.call('Alchemist', "Tasha's Cauldron of Everything", 'An expert at brewing magical elixirs.', {
        3 => [f.call('Tool Proficiency', "Alchemist's supplies."), f.call('Alchemist Spells', 'Always-prepared alchemy spells.'), f.call('Experimental Elixir', 'Brew random elixirs after a rest.')],
        5 => [f.call('Alchemical Savant', 'Add Intelligence to healing and acid, fire, necrotic or poison spell damage.')],
        9 => [f.call('Restorative Reagents', 'Elixirs grant temporary HP; cast lesser restoration for free.')],
        15 => [f.call('Chemical Mastery', 'Resist acid and poison; cast greater restoration and heal free once a day.')],
      }),
      sub.call('Armorer', "Tasha's Cauldron of Everything", 'An artificer who turns armour into a second skin.', {
        3 => [f.call('Tools of the Trade', "Heavy armour and smith's tools."), f.call('Armorer Spells', 'Always-prepared armour spells.'), f.call('Arcane Armor', 'Your armour becomes a magical suit you cannot be disarmed of.'), f.call('Armor Model', 'Guardian (thunder gauntlets, temporary HP) or Infiltrator (lightning launcher, stealth).')],
        5 => [f.call('Extra Attack', 'Attack twice when you take the Attack action.')],
        9 => [f.call('Armor Modifications', 'More infusions on your armour pieces.')],
        15 => [f.call('Perfected Armor', 'Your armour model gains a stronger effect.')],
      }),
      sub.call('Artillerist', "Tasha's Cauldron of Everything", 'A specialist in explosive magic.', {
        3 => [f.call('Tool Proficiency', "Woodcarver's tools."), f.call('Artillerist Spells', 'Always-prepared blasting spells.'), f.call('Eldritch Cannon', 'Build a small cannon: flamethrower, force ballista or protector.')],
        5 => [f.call('Arcane Firearm', 'Add a d8 to spell damage through your firearm.')],
        9 => [f.call('Explosive Cannon', 'Your cannon hits harder and can be detonated.')],
        15 => [f.call('Fortified Position', 'Run two cannons; they give allies half cover.')],
      }),
      sub.call('Battle Smith', "Tasha's Cauldron of Everything", 'A soldier-inventor with a steel defender.', {
        3 => [f.call('Tool Proficiency', "Smith's tools."), f.call('Battle Smith Spells', 'Always-prepared battle spells.'), f.call('Battle Ready', 'Martial weapons; attack with Intelligence using magic weapons.'), f.call('Steel Defender', 'A mechanical companion that fights and protects.')],
        5 => [f.call('Extra Attack', 'Attack twice when you take the Attack action.')],
        9 => [f.call('Arcane Jolt', 'Your hits deal extra force damage or heal.')],
        15 => [f.call('Improved Defender', 'Stronger jolts and a tougher defender.')],
      }),
    ],
  }.freeze

  BLOOD_HUNTER = {
    'index' => 'blood-hunter',
    'name' => 'Blood Hunter',
    'source' => 'Blood Hunter (Matthew Mercer)',
    'description' => 'Hunters who use forbidden blood magic against monsters.',
    'hit_die' => 10,
    'proficiencies' => ['Light armor', 'Medium armor', 'Shields', 'Simple weapons', 'Martial weapons', "Alchemist's supplies"],
    'proficiency_choices' => [skill_choice(3, ['Acrobatics', 'Arcana', 'Athletics', 'History', 'Insight', 'Investigation', 'Religion', 'Survival'])],
    'saving_throws' => %w[dex int],
    'spellcasting_ability' => nil,
    'spellcasting_info' => [],
    # Strength or Dexterity 13, and Intelligence 13.
    'multi_classing' => {
      'prerequisites' => [score('int')],
      'prerequisite_options' => { 'choose' => 1, 'type' => 'ability-scores', 'from' => { 'option_set_type' => 'options_array', 'options' => [score('str'), score('dex')] } },
    },
    'subclass_choice_level' => 3,
    'starting_equipment' => [],
    'starting_equipment_options' => [],
    'levels' => levels(
      specific: lambda { |l|
        {
          'hemocraft_die' => l >= 17 ? 10 : l >= 11 ? 8 : l >= 5 ? 6 : 4,
          'crimson_rites_known' => l >= 14 ? 3 : l >= 7 ? 2 : l >= 2 ? 1 : 0,
          'blood_maledict_uses' => l >= 17 ? 4 : l >= 13 ? 3 : l >= 6 ? 2 : 1,
        }
      },
      features: {
        1 => [f.call("Hunter's Bane", 'Track fey, fiends and undead more easily; advantage on related checks.'),
              f.call('Blood Maledict', 'Use blood curses that hinder foes; amplify them by paying HP.')],
        2 => [f.call('Fighting Style', 'Choose a fighting style.'),
              f.call('Crimson Rite', 'Spend HP to give your weapon extra elemental or dark damage.')],
        3 => [f.call('Blood Hunter Order', 'Join an order.')],
        4 => [ASI],
        5 => [f.call('Extra Attack', 'Attack twice when you take the Attack action.')],
        6 => [f.call('Brand of Castigation', 'Brand a creature you hit so it takes psychic damage when it harms you.'),
              f.call('Blood Maledict (2/rest)', 'Use blood curses twice per rest.')],
        8 => [ASI],
        9 => [f.call('Grim Psychometry', 'Learn the dark history of objects with advantage on checks.')],
        10 => [f.call('Dark Augmentation', 'Add Intelligence to Strength/Dexterity/Constitution saves; more speed.')],
        12 => [ASI],
        13 => [f.call('Brand of Tethering', 'Branded creatures cannot teleport or flee easily.'),
               f.call('Blood Maledict (3/rest)', 'Use blood curses three times per rest.')],
        14 => [f.call('Hardened Soul', 'Advantage against being charmed or frightened.')],
        16 => [ASI],
        17 => [f.call('Blood Maledict (4/rest)', 'Use blood curses four times per rest.')],
        19 => [ASI],
        20 => [f.call('Sanguine Mastery', 'Reroll hemocraft dice and regain a curse on a critical hit.')],
      }
    ),
    'subclasses' => [
      sub.call('Order of the Ghostslayer', 'Blood Hunter (Matthew Mercer)', 'Hunters of the undead.', {
        3 => [f.call('Rite of the Dawn', 'A radiant crimson rite that hurts undead most.'), f.call('Curse Specialist', 'Extra blood maledict uses and stronger curses.')],
        7 => [f.call('Aether Walk', 'Briefly become spectral to move through creatures and objects.')],
        11 => [f.call('Brand of Sundering', 'Branded creatures take more damage and lose resistance to it.')],
        15 => [f.call('Blood Curse of the Exorcist', 'Free a creature from charm, fear or possession.')],
        18 => [f.call('Rite Revival', 'Return to life when you would die while a rite is active.')],
      }),
      sub.call('Order of the Lycan', 'Blood Hunter (Matthew Mercer)', 'Hunters who embrace the curse of the beast.', {
        3 => [f.call('Heightened Senses', 'Advantage on hearing and smell checks.'), f.call('Hybrid Transformation', 'Transform into a powerful hybrid with claws and resistance.')],
        7 => [f.call('Stalker\'s Prowess', 'More speed and jump; claws improve.')],
        11 => [f.call('Advanced Transformation', 'Regenerate while transformed.')],
        15 => [f.call('Brand of the Voracious', 'Advantage against branded creatures while transformed.')],
        18 => [f.call('Hybrid Transformation Mastery', 'Full control of the transformation.')],
      }),
      sub.call('Order of the Mutant', 'Blood Hunter (Matthew Mercer)', 'Hunters who brew mutagens.', {
        3 => [f.call('Formulas', 'Learn mutagen formulas.'), f.call('Mutagencraft', 'Brew mutagens that boost you with a side effect.')],
        7 => [f.call('Strange Metabolism', 'Ignore a mutagen\'s side effect for a minute.')],
        11 => [f.call('Brand of Axiom', 'Branded creatures lose illusions and disguises.')],
        15 => [f.call('Blood Curse of Corrosion', 'Poison a creature with a blood curse.')],
        18 => [f.call('Exalted Mutation', 'Swap active mutagens quickly.')],
      }),
      sub.call('Order of the Profane Soul', 'Blood Hunter (Matthew Mercer)', 'Hunters who make a pact with a dark patron.', {
        3 => [f.call('Otherworldly Patron', 'Choose a patron that shapes your magic.'), f.call('Pact Magic', 'Cast warlock spells using Intelligence.'), f.call('Rite Focus', 'Your rites empower your spells.')],
        7 => [f.call('Mystic Frenzy', 'Cast a cantrip and make a weapon attack.'), f.call('Revealed Arcana', 'Cast a patron spell once per rest.')],
        11 => [f.call('Brand of the Sapping Scar', 'Branded creatures have disadvantage on saves against your spells.')],
        15 => [f.call('Unsealed Arcana', 'Cast a powerful spell once per rest.')],
        18 => [f.call('Blood Curse of the Souleater', 'Recover a spell slot when a creature dies.')],
      }),
    ],
  }.freeze

  ALL = [ARTIFICER, BLOOD_HUNTER].freeze
end
