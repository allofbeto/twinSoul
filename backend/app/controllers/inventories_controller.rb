class Api::V1::InventoriesController < ApplicationController
    include Authenticatable
  
    def show
      character = @current_user.characters.find(params[:character_id])
      inventory = character.inventory || character.create_inventory(user: @current_user)
      render json: inventory.as_json(include: { items: {} }), status: :ok
    end
  
    def create
      character = @current_user.characters.find(params[:character_id])
      inventory = character.build_inventory(user: @current_user)
      if inventory.save
        render json: inventory, status: :created
      else
        render json: { errors: inventory.errors.full_messages }, status: :unprocessable_entity
      end
    end
end