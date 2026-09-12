class Encounter < ApplicationRecord
  belongs_to :user
  belongs_to :campaign, optional: true
  belongs_to :session, optional: true

  has_many :encounter_phases, -> { order(:position) }, dependent: :destroy, inverse_of: :encounter
  has_many :encounter_monsters, through: :encounter_phases
  accepts_nested_attributes_for :encounter_phases, allow_destroy: true

  validates :name, presence: true

  after_create :ensure_default_phase

  private

  def ensure_default_phase
    return if encounter_phases.exists?

    encounter_phases.create!(name: 'Phase 1', position: 0)
  end
end
