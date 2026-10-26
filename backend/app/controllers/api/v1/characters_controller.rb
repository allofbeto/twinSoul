class Api::V1::CharactersController < ApplicationController
    include Authenticatable
    wrap_parameters false
  
    CHARACTER_METHODS = [:classes, :character_class_summaries, :proficiency_bonus].freeze

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
              :name
            ]
          }
        }
      ), status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Character not found' }, status: :not_found
    end

    def create
      character = @current_user.characters.build(character_params)
      ActiveRecord::Base.transaction do
        character.save!
        if params[:char_class_index].present?
          char_class = CharClass.find_by(index: params[:char_class_index], game: character.game)
          if char_class
            character.character_classes.create!(
              char_class: char_class,
              level: character.level,
              subclass_index: params[:subclass_index].presence
            )
          end
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

    def update
      character = @current_user.characters.find(params[:id])
      if character.update(character_params)
        render json: character.as_json(methods: CHARACTER_METHODS), status: :ok
      else
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
      render json: characters.as_json(methods: CHARACTER_METHODS, include: { profile_image: { only: [:id, :url] } }), status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Campaign not found' }, status: :not_found
    end

    private

    def character_params
      params.permit(
        :name, :race, :level, :max_hp, :current_hp,
        :armor_class, :temp_hp, :temp_ac_bonus, :game, :strength, :dexterity,
        :constitution, :intelligence, :wisdom, :charisma,
        :profile_image_id, :campaign_id, :gold, :inspo,
        skills: []
      )
    end
end