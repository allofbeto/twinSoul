# Seeds the shared Monster bestiary from the free, open-licensed 5e SRD
# (fetched from dnd5eapi.co). Source data lives in db/seeds/data/srd_monsters.json.
# Safe to re-run: records are upserted by their stable `index` slug.

require 'json'

CR_FRACTIONS = { 0.125 => '1/8', 0.25 => '1/4', 0.5 => '1/2' }.freeze

def cr_display(cr)
  return nil if cr.nil?

  CR_FRACTIONS[cr] || cr.to_i.to_s
end

def armor_desc_for(armor_class)
  Array(armor_class).filter_map do |ac|
    if ac['armor'].present?
      ac['armor'].map { |a| a['name'] }.join(', ')
    elsif ac['type'] == 'natural'
      'natural armor'
    elsif ac['type'] && ac['type'] != 'dex'
      ac['type']
    end
  end.join(', ').presence
end

def saving_throws_for(proficiencies)
  proficiencies.each_with_object({}) do |prof, acc|
    idx = prof.dig('proficiency', 'index').to_s
    next unless idx.start_with?('saving-throw-')

    acc[idx.sub('saving-throw-', '').upcase] = prof['value']
  end
end

def skills_for(proficiencies)
  proficiencies.each_with_object({}) do |prof, acc|
    idx = prof.dig('proficiency', 'index').to_s
    next unless idx.start_with?('skill-')

    name = idx.sub('skill-', '').split('-').map(&:capitalize).join(' ')
    acc[name] = prof['value']
  end
end

data_path = File.join(__dir__, 'data', 'srd_monsters.json')
monsters = JSON.parse(File.read(data_path))

puts "Seeding #{monsters.size} SRD monsters..."

ActiveRecord::Base.transaction do
  monsters.each do |m|
    proficiencies = m['proficiencies'] || []
    armor_class = m['armor_class'] || []

    monster = Monster.find_or_initialize_by(index: m['index'])
    monster.assign_attributes(
      name: m['name'],
      size: m['size'],
      creature_type: m['type'],
      alignment: m['alignment'],
      armor_class: armor_class.first&.dig('value'),
      armor_desc: armor_desc_for(armor_class),
      hit_points: m['hit_points'],
      hit_dice: m['hit_points_roll'] || m['hit_dice'],
      speed: m['speed'] || {},
      strength: m['strength'],
      dexterity: m['dexterity'],
      constitution: m['constitution'],
      intelligence: m['intelligence'],
      wisdom: m['wisdom'],
      charisma: m['charisma'],
      saving_throws: saving_throws_for(proficiencies),
      skills: skills_for(proficiencies),
      damage_vulnerabilities: m['damage_vulnerabilities'] || [],
      damage_resistances: m['damage_resistances'] || [],
      damage_immunities: m['damage_immunities'] || [],
      condition_immunities: (m['condition_immunities'] || []).map { |c| c['name'] },
      senses: m['senses'] || {},
      languages: m['languages'],
      challenge_rating: cr_display(m['challenge_rating']),
      cr_numeric: m['challenge_rating'],
      proficiency_bonus: m['proficiency_bonus'],
      xp: m['xp'],
      special_abilities: m['special_abilities'] || [],
      actions: m['actions'] || [],
      legendary_actions: m['legendary_actions'] || [],
      reactions: m['reactions'] || [],
      image_url: m['image'] ? "https://www.dnd5eapi.co#{m['image']}" : nil,
      source: 'SRD 5.1'
    )
    monster.save!
  end
end

puts "Done. #{Monster.count} monsters in the bestiary."
