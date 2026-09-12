class Item < ApplicationRecord
    KINDS = %w[item npc monster map encounter art].freeze
    DISPOSITIONS = %w[hostile neutral friendly].freeze

    # Independently revealable sections of a homebrew monster's stat block.
    # A section only reaches non-owner campaign members once the DM adds it
    # here; new monsters start with none, i.e. DM-only by default.
    VISIBILITY_SECTIONS = %w[identity stats traits actions legendary_actions].freeze

    belongs_to :user
    validates :name, presence: true
    validates :kind, inclusion: { in: KINDS }
    validates :disposition, inclusion: { in: DISPOSITIONS }
    validate :visible_sections_are_known
    belongs_to :inventory, optional: true
    belongs_to :campaign, optional: true

    def any_section_visible?
      (visible_sections || []).any?
    end

    # A redacted view of a homebrew monster for a campaign member who isn't
    # its owner: only fields belonging to a section the DM has revealed.
    def player_view
      sections = visible_sections || []
      identity_visible = sections.include?('identity')

      view = {
        id: id,
        kind: kind,
        campaign_id: campaign_id,
        visible_sections: sections,
        name: identity_visible ? name : 'Unknown Creature',
        image_url: identity_visible ? image_url : nil,
        categories: identity_visible ? categories : [],
        notes: identity_visible ? notes : nil,
      }

      if sections.include?('stats')
        view.merge!(
          armor_class: armor_class,
          max_hp: max_hp,
          current_hp: current_hp,
          challenge_rating: challenge_rating,
          strength: strength,
          dexterity: dexterity,
          constitution: constitution,
          intelligence: intelligence,
          wisdom: wisdom,
          charisma: charisma
        )
      end

      view[:traits] = traits if sections.include?('traits')
      view[:actions] = actions if sections.include?('actions')
      view[:legendary_actions] = legendary_actions if sections.include?('legendary_actions')

      view
    end

    private

    def visible_sections_are_known
      return if (visible_sections || []).all? { |s| VISIBILITY_SECTIONS.include?(s) }

      errors.add(:visible_sections, 'contains an unknown section')
    end
end
