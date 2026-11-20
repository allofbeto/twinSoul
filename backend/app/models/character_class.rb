class CharacterClass < ApplicationRecord
  belongs_to :character
  belongs_to :char_class, optional: true

  validates :level, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 20 }
  validate :references_a_class
  validate :total_level_within_cap

  # Adding or dropping a homebrew class changes what the DM has to approve.
  after_save :refresh_character_homebrew_status, if: -> { homebrew_class_changed?(saved_change_to_char_class_id) }
  after_destroy :refresh_character_homebrew_status, if: -> { homebrew_class_changed?([char_class_id]) }

  def display_name
    "#{char_class&.name || custom_name} #{level}"
  end

  private

  def homebrew_class_changed?(class_ids)
    ids = Array(class_ids).compact
    ids.any? && CharClass.homebrew.where(id: ids).exists?
  end

  def refresh_character_homebrew_status
    character.refresh_homebrew_status!
  end

  # A character tops out at level 20 across all their classes.
  def total_level_within_cap
    return unless character

    others = character.character_classes.where.not(id: id).sum(:level)
    errors.add(:level, 'would take the character above level 20') if others + level.to_i > 20
  end

  def references_a_class
    return if char_class_id.present? || custom_name.present?

    errors.add(:base, 'must reference a class or provide a custom name')
  end
end
