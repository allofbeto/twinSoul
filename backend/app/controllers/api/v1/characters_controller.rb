class Api::V1::CharactersController < ApplicationController
    include Authenticatable
    wrap_parameters false
  
    def index
      render json: @current_user.characters, status: :ok
    end
  
    def show
      character = Character.find(params[:id])
      render json: character.as_json(
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
      if character.save
        render json: character.as_json(
        include: { 
          profile_image: { 
            only: [
              :id, 
              :url
              ] 
          } 
        }
      ), status: :created
      else
        render json: { errors: character.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def update
      character = @current_user.characters.find(params[:id])
      if character.update(character_params)
        render json: character, status: :ok
      else
        render json: character.as_json(
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
  
    private
  
    def character_params
      params.permit(
        :name, :race, :level, :max_hp, :current_hp,
        :armor_class, :game, :strength, :dexterity,
        :constitution, :intelligence, :wisdom, :charisma,
        :profile_image_id, :campaign_id, :gold, :inspo,
        classes: [], skills: []
      )
    end
end