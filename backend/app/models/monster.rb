class Monster < ApplicationRecord
  # DMG-style environment tags used to filter the bestiary. A creature can
  # belong to more than one (e.g. a crocodile is both swamp and coastal).
  HABITATS = %w[
    arctic coastal desert forest grassland hill mountain
    swamp underdark underwater urban planar
  ].freeze

  validates :name, presence: true
  validates :index, presence: true, uniqueness: true
  validate :habitats_are_known

  private

  def habitats_are_known
    return if (habitats || []).all? { |h| HABITATS.include?(h) }

    errors.add(:habitats, 'contains an unknown habitat')
  end
end
