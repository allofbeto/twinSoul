class CharClass < ApplicationRecord
  has_many :character_classes, dependent: :restrict_with_error

  validates :index, presence: true, uniqueness: { scope: :game }
  validates :game, presence: true
  validates :name, presence: true
  validates :hit_die, presence: true

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
