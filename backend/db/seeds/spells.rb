# Seeds the SRD 5.1 spells (open-licensed; from the 5e-bits/5e-database
# project behind dnd5eapi.co) from db/seeds/data/srd_spells.json, plus which
# SRD spells sit on the Artificer's list (a published class, so its list is
# mapped here by name only). Safe to re-run: upserted by index.

require 'json'

module SpellSeeds
  # Artificer spells that are in the SRD (Tasha's list, SRD names).
  ARTIFICER = %w[
    acid-splash dancing-lights fire-bolt guidance light mage-hand mending message poison-spray
    prestidigitation ray-of-frost resistance shocking-grasp spare-the-dying
    alarm cure-wounds detect-magic disguise-self expeditious-retreat faerie-fire false-life feather-fall
    grease identify jump longstrider purify-food-and-drink sanctuary
    aid alter-self arcane-lock blur continual-flame darkvision enhance-ability enlarge-reduce heat-metal
    invisibility lesser-restoration levitate magic-mouth magic-weapon protection-from-poison rope-trick
    see-invisibility spider-climb web
    blink create-food-and-water dispel-magic fly glyph-of-warding haste protection-from-energy revivify
    water-breathing water-walk
    arcane-eye fabricate freedom-of-movement secret-chest faithful-hound private-sanctum resilient-sphere
    stone-shape stoneskin
    animate-objects arcane-hand creation greater-restoration wall-of-stone
  ].freeze
end

spells = JSON.parse(File.read(File.join(__dir__, 'data', 'srd_spells.json')))
missing = SpellSeeds::ARTIFICER - spells.map { |s| s['index'] }
warn "Artificer spells not in the SRD file: #{missing.join(', ')}" if missing.any?

rows = spells.map do |s|
  classes = s['classes'].map { |c| c['index'] }
  classes << 'artificer' if SpellSeeds::ARTIFICER.include?(s['index'])
  {
    game: 'dnd_5e',
    index: s['index'],
    name: s['name'],
    level: s['level'],
    school: s.dig('school', 'name'),
    casting_time: s['casting_time'],
    range: s['range'],
    components: s['components'] || [],
    material: s['material'],
    duration: s['duration'],
    concentration: !!s['concentration'],
    ritual: !!s['ritual'],
    attack_type: s['attack_type'],
    desc: s['desc'] || [],
    higher_level: s['higher_level'] || [],
    class_indexes: classes.uniq,
    subclass_indexes: (s['subclasses'] || []).map { |c| c['index'] },
    source: 'SRD 5.1',
  }
end

# Rails fills in created_at / updated_at itself.
Spell.upsert_all(rows, unique_by: %i[game index])
puts "Spells: #{Spell.count} (#{Spell.where('? = ANY(class_indexes)', 'artificer').count} on the Artificer list)."
