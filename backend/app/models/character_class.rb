class CharacterClass < ApplicationRecord
  belongs_to :character
  belongs_to :char_class, optional: true

  validates :level, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 20 }
  validate :references_a_class

  def display_name
    "#{char_class&.name || custom_name} #{level}"
  end

  private

  def references_a_class
    return if char_class_id.present? || custom_name.present?

    errors.add(:base, 'must reference a class or provide a custom name')
  end
end
