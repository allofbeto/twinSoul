# Turns the flat "editor" shape the homebrew forms (and the URL importer)
# work with into the same JSON shape the SRD rows use, so every existing
# picker, feature list and level-up flow can read homebrew unchanged.
#
# Race editor shape:
#   name, description, speed, size, size_description, age, alignment,
#   language_desc, languages[], ability_bonuses[{ability_score, bonus}],
#   traits[{name, desc}], subraces[{name, desc, ability_bonuses[], traits[]}]
#
# Class editor shape:
#   name, description, hit_die, saving_throws[], proficiencies[],
#   spellcasting_ability, subclass_choice_level, subclass_flavor,
#   features[{level, name, desc}], subclasses[{name, desc, features[]}]
module HomebrewNormalizer
  ABILITIES = %w[str dex con int wis cha].freeze
  SIZES = %w[Tiny Small Medium Large Huge Gargantuan].freeze
  HIT_DICE = [6, 8, 10, 12].freeze
  ASI_LEVELS = [4, 8, 12, 16, 19].freeze
  MAX_ENTRIES = 60

  module_function

  # Drawn icons a homebrew race/class may borrow (frontend public/*-icons).
  RACE_ICONS = %w[
    aarakocra aasimar bugbear centaur changeling dragonborn dwarf elf fairy firbolg genasi gith
    gnome goblin goliath grung half-elf half-orc halfling harengon hobgoblin human kalashtar kenku
    kobold leonin lizardfolk locathah loxodon minotaur orc owlin satyr shifter simic-hybrid tabaxi
    tiefling tortle triton vedalken verdan warforged yuan-ti-pureblood
  ].freeze
  CLASS_ICONS = %w[
    artificer barbarian bard blood-hunter cleric druid fighter monk mystic paladin ranger rogue
    sorcerer warlock wizard
  ].freeze

  def icon(value, allowed)
    key = value.to_s.strip
    allowed.include?(key) ? key : nil
  end

  def race_attributes(input)
    h = stringify(input)
    {
      name: text(h['name']),
      description: text(h['description']),
      speed: int(h['speed'], default: 30).clamp(0, 120),
      size: SIZES.include?(h['size'].to_s.capitalize) ? h['size'].to_s.capitalize : 'Medium',
      size_description: text(h['size_description']),
      age: text(h['age']),
      alignment: text(h['alignment']),
      language_desc: text(h['language_desc']),
      languages: list(h['languages']).map { |l| text(l) }.reject(&:blank?).uniq,
      ability_bonuses: ability_bonuses(h['ability_bonuses']),
      traits: named_entries(h['traits']),
      subraces: list(h['subraces']).filter_map do |sr|
        sr = stringify(sr)
        next if text(sr['name']).blank?

        {
          'index' => slug(sr['name']),
          'name' => text(sr['name']),
          'desc' => text(sr['desc']),
          'ability_bonuses' => ability_bonuses(sr['ability_bonuses']),
          'racial_traits' => named_entries(sr['traits'] || sr['racial_traits']),
        }
      end,
      source_url: text(h['source_url']).presence,
      icon: icon(h['icon'], RACE_ICONS),
    }
  end

  def class_attributes(input)
    h = stringify(input)
    features = leveled_features(h['features'])
    choice_level = int(h['subclass_choice_level'], default: 0)
    {
      name: text(h['name']),
      description: text(h['description']),
      hit_die: HIT_DICE.include?(int(h['hit_die'])) ? int(h['hit_die']) : 8,
      saving_throws: abilities(h['saving_throws']),
      proficiencies: list(h['proficiencies']).map { |p| text(p) }.reject(&:blank?).uniq,
      spellcasting_ability: ABILITIES.include?(h['spellcasting_ability'].to_s.downcase) ? h['spellcasting_ability'].to_s.downcase : nil,
      subclass_choice_level: choice_level.between?(1, 20) ? choice_level : nil,
      levels: (1..20).map do |lvl|
        {
          'level' => lvl,
          'prof_bonus' => ((lvl - 1) / 4) + 2,
          'ability_score_bonuses' => ASI_LEVELS.include?(lvl) ? 1 : 0,
          'features' => features.fetch(lvl, []),
          'spellcasting' => nil,
          'class_specific' => {},
        }
      end,
      subclasses: list(h['subclasses']).filter_map do |sc|
        sc = stringify(sc)
        next if text(sc['name']).blank?

        sub_features = leveled_features(sc['features'])
        {
          'index' => slug(sc['name']),
          'name' => text(sc['name']),
          'subclass_flavor' => text(h['subclass_flavor']).presence || 'Subclass',
          'desc' => paragraphs(sc['desc']),
          'levels' => sub_features.keys.sort.map { |lvl| { 'level' => lvl, 'features' => sub_features[lvl] } },
        }
      end,
      source_url: text(h['source_url']).presence,
      icon: icon(h['icon'], CLASS_ICONS),
    }
  end

  # -- helpers ---------------------------------------------------------------

  def stringify(value)
    value = value.to_unsafe_h if value.respond_to?(:to_unsafe_h)
    value.is_a?(Hash) ? value.deep_stringify_keys : {}
  end

  def list(value)
    value = value.values if value.is_a?(Hash) # form-encoded arrays
    Array(value).first(MAX_ENTRIES)
  end

  def text(value)
    value.is_a?(Array) ? value.map(&:to_s).join("\n\n").strip : value.to_s.strip
  end

  def int(value, default: 0)
    Integer(value.to_s, 10)
  rescue ArgumentError
    default
  end

  def slug(name)
    name.to_s.parameterize.presence || SecureRandom.hex(3)
  end

  # Descriptions come in as one block of text; SRD rows store paragraphs.
  def paragraphs(value)
    raw = value.is_a?(Array) ? value.map(&:to_s) : value.to_s.split(/\n\s*\n/)
    raw.map(&:strip).reject(&:blank?)
  end

  def abilities(value)
    list(value).map { |a| a.to_s.downcase[0, 3] }.select { |a| ABILITIES.include?(a) }.uniq
  end

  def ability_bonuses(value)
    list(value).filter_map do |b|
      b = stringify(b)
      ability = b['ability_score'].to_s.downcase[0, 3]
      bonus = int(b['bonus'])
      next unless ABILITIES.include?(ability) && bonus != 0

      { 'ability_score' => ability, 'bonus' => bonus.clamp(-4, 4) }
    end
  end

  def named_entries(value)
    seen = Hash.new(0)
    list(value).filter_map do |e|
      e = stringify(e)
      name = text(e['name'])
      next if name.blank?

      base = slug(name)
      seen[base] += 1
      { 'index' => seen[base] > 1 ? "#{base}-#{seen[base]}" : base, 'name' => name, 'desc' => paragraphs(e['desc']) }
    end
  end

  # [{level, name, desc}] -> { level => [{index, name, desc}] }
  def leveled_features(value)
    list(value).each_with_object(Hash.new { |hash, k| hash[k] = [] }) do |f, by_level|
      f = stringify(f)
      lvl = int(f['level'], default: 1).clamp(1, 20)
      entry = named_entries([f]).first
      by_level[lvl] << entry if entry
    end.to_h
  end
end
