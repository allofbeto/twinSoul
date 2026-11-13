# Feat catalog. Grappler is the only feat in the SRD; the rest are short
# summaries written for twinSoul (never paste the books' text here).
# `ability` lists the abilities the feat can raise by 1 (player picks one).

module PublishedFeats
  module_function

  def slug(text)
    text.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-|-\z/, '')
  end

  def feat(name, source, desc, ability: [], prereq: nil)
    {
      'index' => slug(name),
      'name' => name,
      'source' => source,
      'prerequisite' => prereq,
      'desc' => Array(desc),
      'ability_options' => ability,
      'ability_bonus' => ability.empty? ? 0 : 1,
    }
  end

  PHB = "Player's Handbook"
  XGTE = "Xanathar's Guide to Everything"
  TCOE = "Tasha's Cauldron of Everything"
  SRD = 'SRD 5.1'
  ALL_SIX = %w[str dex con int wis cha].freeze
  MENTAL = %w[int wis cha].freeze

  ALL = [
    feat('Grappler', SRD, 'Advantage on attacks against creatures you grapple, and you can pin them.', prereq: 'Strength 13'),

    feat('Actor', PHB, 'Advantage on Deception and Performance when pretending to be someone; mimic voices.', ability: %w[cha]),
    feat('Alert', PHB, '+5 to initiative, cannot be surprised while conscious, and hidden attackers gain no advantage.'),
    feat('Athlete', PHB, 'Stand up and climb faster; jump with only a short run-up.', ability: %w[str dex]),
    feat('Charger', PHB, 'After a Dash, make a bonus attack or shove with extra force.'),
    feat('Crossbow Expert', PHB, 'Ignore loading, shoot in melee without disadvantage, and make a bonus hand-crossbow attack.'),
    feat('Defensive Duelist', PHB, 'Add proficiency to AC against one melee attack as a reaction.', prereq: 'Dexterity 13'),
    feat('Dual Wielder', PHB, '+1 AC while dual wielding, and dual wield non-light weapons.'),
    feat('Dungeon Delver', PHB, 'Advantage to find secret doors and avoid traps; resist trap damage.'),
    feat('Durable', PHB, 'Hit Dice heal at least twice your Constitution modifier.', ability: %w[con]),
    feat('Elemental Adept', PHB, 'Your spells ignore resistance to one element and treat 1s as 2s.', prereq: 'Ability to cast a spell'),
    feat('Great Weapon Master', PHB, 'Bonus attack after a crit or kill; take -5 to hit for +10 damage with heavy weapons.'),
    feat('Healer', PHB, 'Use a healer\'s kit to stabilise and restore HP.'),
    feat('Heavily Armored', PHB, 'Gain heavy armour proficiency.', ability: %w[str], prereq: 'Medium armor proficiency'),
    feat('Heavy Armor Master', PHB, 'Reduce nonmagical weapon damage by 3 in heavy armour.', ability: %w[str], prereq: 'Heavy armor proficiency'),
    feat('Inspiring Leader', PHB, 'A speech gives allies temporary HP.', prereq: 'Charisma 13'),
    feat('Keen Mind', PHB, 'Always know north and the time; recall anything from the past month.', ability: %w[int]),
    feat('Lightly Armored', PHB, 'Gain light armour proficiency.', ability: %w[str dex]),
    feat('Linguist', PHB, 'Learn three languages and create ciphers.', ability: %w[int]),
    feat('Lucky', PHB, 'Three luck points a day to reroll attacks, checks and saves.'),
    feat('Mage Slayer', PHB, 'Punish nearby spellcasters and resist their spells.'),
    feat('Magic Initiate', PHB, 'Learn two cantrips and a 1st-level spell from one class.'),
    feat('Martial Adept', PHB, 'Learn two Battle Master manoeuvres and gain a superiority die.'),
    feat('Medium Armor Master', PHB, 'No Stealth penalty in medium armour; add up to +3 Dexterity to AC.', prereq: 'Medium armor proficiency'),
    feat('Mobile', PHB, '+10 speed; Dash ignores difficult terrain; no opportunity attacks from creatures you attack.'),
    feat('Moderately Armored', PHB, 'Gain medium armour and shield proficiency.', ability: %w[str dex], prereq: 'Light armor proficiency'),
    feat('Mounted Combatant', PHB, 'Advantage against unmounted foes and protect your mount.'),
    feat('Observant', PHB, '+5 to passive Perception and Investigation; read lips.', ability: %w[int wis]),
    feat('Polearm Master', PHB, 'A bonus butt-end attack, and opportunity attacks when foes enter your reach.'),
    feat('Resilient', PHB, 'Gain proficiency in saving throws for the ability you raise.', ability: ALL_SIX),
    feat('Ritual Caster', PHB, 'Keep a ritual book and cast rituals from it.', prereq: 'Intelligence or Wisdom 13'),
    feat('Savage Attacker', PHB, 'Reroll melee weapon damage once per turn.'),
    feat('Sentinel', PHB, 'Opportunity attacks stop movement, and you punish attacks on allies.'),
    feat('Sharpshooter', PHB, 'Ignore cover and long-range penalties; take -5 to hit for +10 damage at range.'),
    feat('Shield Master', PHB, 'Shove with your shield as a bonus action and protect yourself from area effects.'),
    feat('Skilled', PHB, 'Gain proficiency in three skills or tools.'),
    feat('Skulker', PHB, 'Hide in dim light and stay hidden when you miss.', prereq: 'Dexterity 13'),
    feat('Spell Sniper', PHB, 'Double spell range, ignore cover, and learn an attack cantrip.', prereq: 'Ability to cast a spell'),
    feat('Tavern Brawler', PHB, 'Proficient with improvised weapons; bigger unarmed strikes and bonus grapples.', ability: %w[str con]),
    feat('Tough', PHB, 'Your hit point maximum increases by 2 for every level you have.'),
    feat('War Caster', PHB, 'Advantage on concentration, cast with full hands, and cast spells as opportunity attacks.', prereq: 'Ability to cast a spell'),
    feat('Weapon Master', PHB, 'Gain proficiency with four weapons.', ability: %w[str dex]),

    feat('Artificer Initiate', TCOE, 'Learn an artificer cantrip and 1st-level spell, plus a tool.'),
    feat('Chef', TCOE, 'Cook food that heals during rests and treats that grant temporary HP.', ability: %w[con wis]),
    feat('Crusher', TCOE, 'Push creatures with bludgeoning hits; crits give allies advantage.', ability: %w[str con]),
    feat('Eldritch Adept', TCOE, 'Learn one Eldritch Invocation.', prereq: 'Spellcasting or Pact Magic'),
    feat('Fey Touched', TCOE, 'Learn misty step and one 1st-level divination or enchantment spell.', ability: MENTAL),
    feat('Fighting Initiate', TCOE, 'Learn one fighting style.', prereq: 'Martial weapon proficiency'),
    feat('Gunner', TCOE, 'Firearm proficiency, ignore loading, and shoot in melee without disadvantage.', ability: %w[dex]),
    feat('Metamagic Adept', TCOE, 'Learn two Metamagic options and gain two sorcery points.', prereq: 'Spellcasting or Pact Magic'),
    feat('Piercer', TCOE, 'Reroll a piercing damage die and add a die on crits.', ability: %w[str dex]),
    feat('Poisoner', TCOE, 'Ignore poison resistance and brew potent poisons.'),
    feat('Shadow Touched', TCOE, 'Learn invisibility and one 1st-level illusion or necromancy spell.', ability: MENTAL),
    feat('Skill Expert', TCOE, 'Gain a skill proficiency and expertise in one skill.', ability: ALL_SIX),
    feat('Slasher', TCOE, 'Slashing hits slow foes; crits weaken them.', ability: %w[str dex]),
    feat('Telekinetic', TCOE, 'Invisible mage hand and a telekinetic shove as a bonus action.', ability: MENTAL),
    feat('Telepathic', TCOE, 'Speak telepathically and cast detect thoughts.', ability: MENTAL),

    feat('Bountiful Luck', XGTE, 'Let an ally reroll a 1.', prereq: 'Halfling'),
    feat('Dragon Fear', XGTE, 'Use your breath weapon to frighten instead.', ability: %w[str con cha], prereq: 'Dragonborn'),
    feat('Dragon Hide', XGTE, 'Natural armour of 13 + Dexterity and claws.', ability: %w[str con cha], prereq: 'Dragonborn'),
    feat('Drow High Magic', XGTE, 'Cast detect magic at will, plus levitate and dispel magic daily.', prereq: 'Elf (drow)'),
    feat('Dwarven Fortitude', XGTE, 'Dodge and spend a Hit Die to heal.', ability: %w[con], prereq: 'Dwarf'),
    feat('Elven Accuracy', XGTE, 'Roll an extra die when you attack with advantage.', ability: %w[dex int wis cha], prereq: 'Elf or half-elf'),
    feat('Fade Away', XGTE, 'Turn invisible after taking damage.', ability: %w[dex int], prereq: 'Gnome'),
    feat('Fey Teleportation', XGTE, 'Learn Sylvan and cast misty step.', ability: %w[int cha], prereq: 'Elf (high)'),
    feat('Flames of Phlegethos', XGTE, 'Reroll 1s on fire spells and wreathe yourself in flame.', ability: %w[int cha], prereq: 'Tiefling'),
    feat('Infernal Constitution', XGTE, 'Resist cold and poison; advantage against being poisoned.', ability: %w[con], prereq: 'Tiefling'),
    feat('Orcish Fury', XGTE, 'Extra weapon damage once per rest and an attack when you endure.', ability: %w[str con], prereq: 'Half-orc'),
    feat('Prodigy', XGTE, 'Gain a skill, a tool, a language and expertise.', prereq: 'Half-elf, half-orc or human'),
    feat('Second Chance', XGTE, 'Force an attacker to reroll a hit.', ability: %w[dex con cha], prereq: 'Halfling'),
    feat('Squat Nimbleness', XGTE, 'More speed and escape grapples easily.', ability: %w[str dex], prereq: 'Dwarf or a Small race'),
    feat('Wood Elf Magic', XGTE, 'Learn a druid cantrip, longstrider and pass without trace.', prereq: 'Elf (wood)'),
  ].freeze
end
