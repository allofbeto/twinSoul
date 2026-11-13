# Published (non-SRD) class content: extra subclasses for the SRD classes,
# the Artificer and Blood Hunter classes, and the feat catalog. Only
# mechanics and twinSoul's own summaries; see db/seeds/data/published_*.rb.
# Safe to re-run: everything is upserted by index.

require_relative 'data/published_subclasses'
require_relative 'data/published_classes'
require_relative 'data/published_feats'

ActiveRecord::Base.transaction do
  # Extra subclasses: keep the SRD one(s) first, then the published ones.
  PublishedSubclasses::BY_CLASS.each do |class_index, extras|
    cls = CharClass.find_by(index: class_index, game: 'dnd_5e', user_id: nil)
    next unless cls

    srd = (cls.subclasses || []).reject { |s| s['source'].present? }
    flavor = srd.first&.dig('subclass_flavor')
    published = extras.map { |s| s.merge('subclass_flavor' => flavor) }
    cls.update!(subclasses: srd + published.reject { |p| srd.any? { |s| s['index'] == p['index'] } })
  end

  # Whole classes that are not in the SRD.
  flavors = { 'artificer' => 'Artificer Specialist', 'blood-hunter' => 'Blood Hunter Order' }
  PublishedClasses::ALL.each do |data|
    cls = CharClass.find_or_initialize_by(index: data['index'], game: 'dnd_5e', user_id: nil)
    subclasses = data['subclasses'].map { |s| s.merge('subclass_flavor' => flavors[data['index']]) }
    cls.assign_attributes(data.except('index').merge('subclasses' => subclasses))
    cls.save!
  end

  PublishedFeats::ALL.each do |data|
    feat = Feat.find_or_initialize_by(index: data['index'], game: 'dnd_5e')
    feat.assign_attributes(data.except('index'))
    feat.save!
  end
end

puts "Published content: #{CharClass.official.count} classes, " \
     "#{CharClass.official.sum { |c| c.subclasses.size }} subclasses, #{Feat.count} feats."
