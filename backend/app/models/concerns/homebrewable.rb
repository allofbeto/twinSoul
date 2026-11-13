# Shared behaviour for reference tables (char_races, char_classes) that hold
# both SRD content (user_id NULL) and player-made homebrew (user_id set).
module Homebrewable
  extend ActiveSupport::Concern

  included do
    belongs_to :user, optional: true

    scope :official, -> { where(user_id: nil) }
    scope :homebrew, -> { where.not(user_id: nil) }

    before_validation :assign_homebrew_index, on: :create
    after_update :send_characters_back_for_review, if: :homebrew_content_changed?

    validates :source_url, format: { with: %r{\Ahttps?://}i }, allow_blank: true
  end

  class_methods do
    # SRD rows, the user's own homebrew, and homebrew used by any character
    # in a campaign the user runs or plays in (so a DM can read a player's
    # homebrew, and party members can see each other's sheets).
    def visible_to(user)
      shared_ids = homebrew_ids_in_campaigns(user.involved_campaign_ids)
      where(user_id: nil).or(where(user_id: user.id)).or(where(id: shared_ids))
    end

    # What a user may put on their own character: SRD content or homebrew
    # they authored. Someone else's homebrew is read-only to them.
    def selectable_by(user)
      where(user_id: nil).or(where(user_id: user.id))
    end
  end

  def homebrew?
    user_id.present?
  end

  def as_json(options = {})
    super.merge('homebrew' => homebrew?)
  end

  private

  def assign_homebrew_index
    return unless homebrew? && index.blank?

    self.index = "hb-#{name.to_s.parameterize.presence || 'custom'}-#{SecureRandom.hex(3)}"
  end

  # Content the DM approved is no longer what they approved: every character
  # using it in a campaign goes back to pending.
  def homebrew_content_changed?
    homebrew? && (saved_changes.keys - %w[updated_at source_url icon]).any?
  end

  def send_characters_back_for_review
    characters_using_this.where(homebrew_status: %w[approved rejected]).find_each(&:refresh_homebrew_status!)
  end
end
