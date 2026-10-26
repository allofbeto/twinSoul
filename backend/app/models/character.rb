class Character < ApplicationRecord
    ABILITY_KEYS = %w[strength dexterity constitution intelligence wisdom charisma].freeze

    # Game systems with a working character sheet/rules engine behind them.
    # Adding a new system (e.g. Call of Cthulhu) means adding its key here
    # once its creation flow and reference data actually exist -- until then
    # the frontend's game picker keeps it listed but disabled.
    SUPPORTED_GAMES = %w[dnd_5e].freeze

    belongs_to :user
    belongs_to :profile_image, class_name: 'ImageAsset', optional: true
    belongs_to :campaign, optional: true

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

    def level_up!(char_class:, hp_gained:, subclass_index: nil, ability_score_changes: {})
      transaction do
        cc = character_classes.find_or_initialize_by(char_class: char_class)
        cc.level = cc.new_record? ? 1 : cc.level + 1
        cc.subclass_index = subclass_index if subclass_index.present?
        cc.save!

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
  end