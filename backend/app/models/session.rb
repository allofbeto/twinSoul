class Session < ApplicationRecord
    belongs_to :campaign, optional: true
    belongs_to :user
    has_many :encounters, dependent: :nullify
    has_many :battle_maps, dependent: :nullify
    validates :title, presence: true
    validate :combat_is_reasonable

    MAX_COMBATANTS = 100
    MAX_COMBAT_BYTES = 400.kilobytes

    private

    # A tracker is a list of creatures, not a place to store arbitrary data.
    def combat_is_reasonable
      return if combat.nil?

      unless combat.is_a?(Hash) && combat['combatants'].is_a?(Array)
        errors.add(:combat, 'is not a valid combat')
        return
      end
      errors.add(:combat, "can have at most #{MAX_COMBATANTS} combatants") if combat['combatants'].size > MAX_COMBATANTS
      errors.add(:combat, 'is too large') if combat.to_json.bytesize > MAX_COMBAT_BYTES
    end
end