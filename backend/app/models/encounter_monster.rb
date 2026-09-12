class EncounterMonster < ApplicationRecord
  belongs_to :encounter_phase
  belongs_to :monster, optional: true
  belongs_to :item, optional: true

  validates :name, presence: true
  validates :quantity, numericality: { greater_than: 0 }
end
