class Api::V1::CharactersController < ApplicationController
    include Authenticatable
    wrap_parameters false
  
    CHARACTER_METHODS = [:classes, :character_class_summaries, :proficiency_bonus, :homebrew_summary].freeze
    CHAR_RACE_FIELDS = { only: [:index, :name, :user_id, :speed, :icon] }.freeze

    def index
      characters = @current_user.characters.includes(character_classes: :char_class)
      render json: characters.as_json(methods: CHARACTER_METHODS), status: :ok
    end

    def show
      character = Character.find(params[:id])
      render json: character.as_json(
        methods: CHARACTER_METHODS,
        include: {
          profile_image: {
            only: [
              :id,
              :url
              ]
          },
          campaign: {
            only: [
              :id,
              :name,
              :user_id
            ]
          },
          char_race: CHAR_RACE_FIELDS
        }
      ), status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Character not found' }, status: :not_found
    end

    def create
      character = @current_user.characters.build(character_params)
      assign_char_race(character)
      class_picks = requested_class_picks(character)
      return render json: { errors: class_picks[:errors] }, status: :unprocessable_entity if class_picks[:errors]

      # With classes, the character's level is the sum of its class levels.
      character.level = class_picks[:picks].sum { |p| p[:level] } if class_picks[:picks].any?
      ActiveRecord::Base.transaction do
        character.save!
        # Created in order, so the first pick stays the starting class.
        class_picks[:picks].each do |pick|
          character.character_classes.create!(
            char_class: pick[:char_class],
            level: pick[:level],
            subclass_index: pick[:subclass_index]
          )
        end
      end
      render json: character.as_json(
        methods: CHARACTER_METHODS,
        include: {
          profile_image: {
            only: [
              :id,
              :url
              ]
          }
        }
      ), status: :created
    rescue ActiveRecord::RecordInvalid
      render json: { errors: character.errors.full_messages }, status: :unprocessable_entity
    end

    # Classes for a new character. Accepts `classes: [{char_class_index,
    # level, subclass_index}]` (multiclass, first entry = starting class) or
    # the older single `char_class_index` + `subclass_index`.
    def requested_class_picks(character)
      raw =
        if params[:classes].is_a?(Array)
          params[:classes].map { |c| c.permit(:char_class_index, :level, :subclass_index).to_h.symbolize_keys }
        elsif params[:char_class_index].present?
          [{ char_class_index: params[:char_class_index], level: character.level, subclass_index: params[:subclass_index] }]
        else
          []
        end
      return { picks: [] } if raw.empty?

      allowed = CharClass.selectable_by(@current_user).where(game: character.game)
      picks = raw.map do |c|
        char_class = allowed.find_by(index: c[:char_class_index])
        return { errors: ["Class '#{c[:char_class_index]}' isn't available"] } unless char_class

        { char_class: char_class, level: c[:level].to_i, subclass_index: c[:subclass_index].presence }
      end

      return { errors: ['Each class can only be taken once'] } if picks.map { |p| p[:char_class].id }.uniq.size != picks.size
      return { errors: ['Class levels must be between 1 and 20'] } unless picks.all? { |p| p[:level].between?(1, 20) }
      return { errors: ['Total character level cannot be above 20'] } if picks.sum { |p| p[:level] } > 20

      { picks: picks }
    end
    private :requested_class_picks

    def update
      character = @current_user.characters.find(params[:id])
      character.assign_attributes(character_params)
      assign_char_race(character)
      if character.save
        render json: character.as_json(methods: CHARACTER_METHODS, include: { char_race: CHAR_RACE_FIELDS }), status: :ok
      else
        render json: { errors: character.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Character not found' }, status: :not_found
    end
  
    def destroy
      character = @current_user.characters.find(params[:id])
      character.destroy
      render json: { message: 'Character deleted' }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Character not found' }, status: :not_found
    end

    def migrate_inventory
      character = @current_user.characters.find(params[:id])
      action = params[:action_type]
      inventory = character.inventory
    
      if action == 'migrate'
        Item.where(inventory_id: inventory.id).update_all(campaign_id: character.campaign_id)
        render json: { message: 'Items migrated to campaign' }, status: :ok
      elsif action == 'clear'
        Item.where(inventory_id: inventory.id).delete_all
        render json: { message: 'Inventory cleared' }, status: :ok
      else
        render json: { error: 'Invalid action' }, status: :unprocessable_entity
      end
    end

    def campaign_characters
      campaign = Campaign.find(params[:campaign_id])
      characters = Character.where(campaign_id: campaign.id).includes(character_classes: :char_class)
      # Until the DM approves a character's homebrew, only the DM sees it at the table.
      characters = characters.playable unless campaign.user_id == @current_user.id
      render json: characters.as_json(methods: CHARACTER_METHODS, include: { profile_image: { only: [:id, :url] } }), status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Campaign not found' }, status: :not_found
    end

    private

    # The race picker sends the race's index; the name string stays the
    # display value (it includes the subrace). Unknown or someone else's
    # homebrew race is ignored rather than linked.
    def assign_char_race(character)
      return unless params.key?(:char_race_index)

      if params[:char_race_index].blank?
        character.char_race = nil
        character.subrace_index = nil
      else
        character.char_race = CharRace.selectable_by(@current_user).find_by(index: params[:char_race_index], game: character.game)
        character.subrace_index = params[:subrace_index].presence
      end
    end

    def character_params
      params.permit(
        :name, :race, :level, :max_hp, :current_hp,
        :armor_class, :temp_hp, :temp_ac_bonus, :game, :strength, :dexterity,
        :constitution, :intelligence, :wisdom, :charisma,
        :profile_image_id, :campaign_id, :gold, :inspo, :background,
        :notes, :speed, :death_save_successes, :death_save_failures,
        skills: [],
        expertise: [],
        hit_dice_used: {},
        spell_slots_used: {},
        resources_used: {},
        overrides: {},
        custom_trackers: [:id, :label, :total, :used, :recharge],
        languages: [],
        feats: [:index, :name, :ability, :taken_at, :source, :desc],
        feature_choices: [:id, :group, :index, :name, :source, :desc],
        actions: [:id, :name, :kind, :cast_time, :spell_level, :attack, :damage, :range, :notes],
        spells: [:index, :name, :level, :source, :prepared, :custom, :school, :casting_time, :range, :duration, :notes,
                 { source_ref: [:id, :name, :kind] }]
      )
    end
end