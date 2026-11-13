class Character < ApplicationRecord
    ABILITY_KEYS = %w[strength dexterity constitution intelligence wisdom charisma].freeze

    # Game systems with a working character sheet/rules engine behind them.
    # Adding a new system (e.g. Call of Cthulhu) means adding its key here
    # once its creation flow and reference data actually exist -- until then
    # the frontend's game picker keeps it listed but disabled.
    SUPPORTED_GAMES = %w[dnd_5e].freeze
    HOMEBREW_STATUSES = %w[pending approved rejected].freeze

    belongs_to :user
    belongs_to :profile_image, class_name: 'ImageAsset', optional: true
    belongs_to :campaign, optional: true
    belongs_to :char_race, optional: true
    belongs_to :homebrew_reviewed_by, class_name: 'User', optional: true

    has_one :inventory, dependent: :destroy
    has_many :character_classes, -> { order(:created_at) }, dependent: :destroy
    has_many :char_classes, through: :character_classes

    validates :name, presence: true
    validates :race, presence: true
    validates :level, numericality: { greater_than: 0, less_than_or_equal_to: 20 }
    validates :max_hp, :current_hp, :armor_class, numericality: { greater_than_or_equal_to: 0 }
    validates :temp_hp, numericality: { greater_than_or_equal_to: 0 }
    validates :temp_ac_bonus, numericality: { only_integer: true }
    validates :game, inclusion: { in: SUPPORTED_GAMES }
    validates :homebrew_status, inclusion: { in: HOMEBREW_STATUSES }, allow_nil: true

    after_save :refresh_homebrew_status!, if: :homebrew_review_inputs_changed?

    # Characters a campaign can use at the table: no homebrew, or homebrew
    # the DM signed off on.
    scope :playable, -> { where(homebrew_status: [nil, 'approved']) }

    # Homebrew this character is built from, for the DM to review.
    def homebrew_races
      CharRace.homebrew.where(id: char_race_id)
    end

    def homebrew_classes
      CharClass.homebrew.where(id: character_classes.select(:char_class_id))
    end

    def uses_homebrew?
      homebrew_races.exists? || homebrew_classes.exists?
    end

    def homebrew_summary
      homebrew_races.map { |r| { kind: 'race', index: r.index, name: r.name, source_url: r.source_url } } +
        homebrew_classes.map { |c| { kind: 'class', index: c.index, name: c.name, source_url: c.source_url } }
    end

    # Works out the review state from scratch. Any change to the homebrew a
    # character uses, or to the campaign it's in, throws away a previous
    # verdict: the DM approved a specific build for a specific game.
    def refresh_homebrew_status!
      status =
        if campaign_id.nil? || !uses_homebrew?
          nil
        elsif campaign&.user_id == user_id
          'approved' # the DM's own character in their own campaign
        else
          'pending'
        end

      update_columns(
        homebrew_status: status,
        homebrew_review_note: nil,
        homebrew_reviewed_at: nil,
        homebrew_reviewed_by_id: nil,
        updated_at: Time.current
      )
    end

    def review_homebrew!(reviewer:, approve:, note: nil)
      update!(
        homebrew_status: approve ? 'approved' : 'rejected',
        homebrew_review_note: note.presence,
        homebrew_reviewed_at: Time.current,
        homebrew_reviewed_by: reviewer
      )
    end

    # `classes` used to be a freeform string array the player typed into by
    # hand. It's superseded by the `character_classes` association, which
    # tracks a real SRD class + level (+ subclass) per multiclass entry. Old
    # records that predate that association still carry data in the raw
    # column, so fall back to it until the player re-enters their classes
    # through the class manager.
    def classes
      return character_classes.map(&:display_name) if character_classes.loaded? ? character_classes.any? : character_classes.exists?

      read_attribute(:classes) || []
    end

    def character_class_summaries
      character_classes.includes(:char_class).map do |cc|
        {
          id: cc.id,
          level: cc.level,
          subclass_index: cc.subclass_index,
          char_class_index: cc.char_class&.index,
          char_class_name: cc.char_class&.name,
          custom_name: cc.custom_name,
        }
      end
    end

    def proficiency_bonus
      ((level - 1) / 4) + 2
    end

    # `feat` (optional): { index:, ability: } taken instead of an Ability
    # Score Improvement; its +1 (if any) arrives in `ability_score_changes`.
    def level_up!(char_class:, hp_gained:, subclass_index: nil, ability_score_changes: {}, feat: nil)
      transaction do
        cc = character_classes.find_or_initialize_by(char_class: char_class)
        cc.level = cc.new_record? ? 1 : cc.level + 1
        cc.subclass_index = subclass_index if subclass_index.present?
        cc.save!

        if feat.present?
          record = Feat.find_by!(index: feat[:index] || feat['index'], game: game)
          self.feats = (feats || []) + [{
            'index' => record.index,
            'name' => record.name,
            'ability' => (feat[:ability] || feat['ability']).presence,
            'taken_at' => "#{char_class.name} #{cc.level}",
          }.compact]
        end

        ability_score_changes.each do |ability, delta|
          next unless ABILITY_KEYS.include?(ability.to_s)

          current = read_attribute(ability) || 10
          write_attribute(ability, [current + delta.to_i, 20].min)
        end

        self.max_hp += hp_gained
        self.current_hp += hp_gained
        self.level = character_classes.reload.sum(:level)
        save!
      end
      self
    end

    private

    def homebrew_review_inputs_changed?
      return true if saved_change_to_campaign_id?
      return false unless saved_change_to_char_race_id?

      CharRace.homebrew.where(id: saved_change_to_char_race_id.compact).exists?
    end
  end