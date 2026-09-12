class EncounterPhase < ApplicationRecord
  belongs_to :encounter

  has_many :encounter_monsters, -> { order(:created_at) }, dependent: :destroy, inverse_of: :encounter_phase
  accepts_nested_attributes_for :encounter_monsters, allow_destroy: true

  validates :name, presence: true
end
