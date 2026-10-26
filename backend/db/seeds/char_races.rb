# Seeds the shared CharRace rules reference from the free, open-licensed 5e
# SRD (fetched from dnd5eapi.co). Source data lives in
# db/seeds/data/srd_races.json. Safe to re-run: records are upserted by
# their stable `index` slug.

require 'json'

data_path = File.join(__dir__, 'data', 'srd_races.json')
races = JSON.parse(File.read(data_path))

puts "Seeding #{races.size} SRD races..."

ActiveRecord::Base.transaction do
  races.each do |r|
    char_race = CharRace.find_or_initialize_by(index: r['index'], game: 'dnd_5e')
    char_race.assign_attributes(
      name: r['name'],
      speed: r['speed'],
      size: r['size'],
      size_description: r['size_description'],
      age: r['age'],
      alignment: r['alignment'],
      language_desc: r['language_desc'],
      languages: r['languages'] || [],
      ability_bonuses: r['ability_bonuses'] || [],
      traits: r['traits'] || [],
      subraces: r['subraces'] || [],
    )
    char_race.save!
  end
end

puts "Done. #{CharRace.count} races in the database."
