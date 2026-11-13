class CharClass < ApplicationRecord
  include Homebrewable

  has_many :character_classes, dependent: :restrict_with_error

  validates :index, presence: true, uniqueness: { scope: :game }
  validates :game, presence: true
  validates :name, presence: true
  validates :hit_die, presence: true, inclusion: { in: [4, 6, 8, 10, 12, 20] }

  def self.homebrew_ids_in_campaigns(campaign_ids)
    CharacterClass.joins(:character)
                  .where(characters: { campaign_id: campaign_ids })
                  .where.not(char_class_id: nil)
                  .select(:char_class_id)
  end

  def characters_using_this
    Character.where(id: character_classes.select(:character_id)).where.not(campaign_id: nil)
  end

  def spellcaster?
    spellcasting_ability.present?
  end

  def subclass(subclass_index)
    (subclasses || []).find { |s| s['index'] == subclass_index }
  end

  def level_data(level)
    (levels || []).find { |l| l['level'] == level }
  end
end
