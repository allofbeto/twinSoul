# Seeds published, non-SRD 5e races (Volo's, Eberron, Ravnica, ...) as
# shared reference rows. Only mechanics and original summaries are stored;
# see db/seeds/data/published_races.rb. Safe to re-run: upserted by index.

require_relative 'data/published_races'

races = PublishedRaces::ALL
puts "Seeding #{races.size} published races (summaries)..."

ActiveRecord::Base.transaction do
  races.each do |r|
    char_race = CharRace.find_or_initialize_by(index: r['index'], game: 'dnd_5e', user_id: nil)
    char_race.assign_attributes(r.except('index'))
    char_race.save!
  end
end

puts "Done. #{CharRace.official.count} official races in the database."
