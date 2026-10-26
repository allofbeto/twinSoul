# Seeds the shared CharClass rules reference from the free, open-licensed 5e
# SRD (fetched from dnd5eapi.co). Source data lives in
# db/seeds/data/srd_classes.json. Safe to re-run: records are upserted by
# their stable `index` slug.

require 'json'

data_path = File.join(__dir__, 'data', 'srd_classes.json')
classes = JSON.parse(File.read(data_path))

puts "Seeding #{classes.size} SRD classes..."

ActiveRecord::Base.transaction do
  classes.each do |c|
    subclass_levels = (c['subclasses'] || []).flat_map { |sc| sc['levels'].map { |l| l['level'] } }

    char_class = CharClass.find_or_initialize_by(index: c['index'], game: 'dnd_5e')
    char_class.assign_attributes(
      name: c['name'],
      hit_die: c['hit_die'],
      proficiencies: c['proficiencies'] || [],
      proficiency_choices: c['proficiency_choices'] || [],
      saving_throws: c['saving_throws'] || [],
      starting_equipment: c['starting_equipment'] || [],
      starting_equipment_options: c['starting_equipment_options'] || [],
      spellcasting_ability: c['spellcasting_ability'],
      spellcasting_info: c['spellcasting_info'] || [],
      multi_classing: c['multi_classing'] || {},
      subclasses: c['subclasses'] || [],
      levels: c['levels'] || [],
      subclass_choice_level: subclass_levels.min,
    )
    char_class.save!
  end
end

puts "Done. #{CharClass.count} classes in the database."
