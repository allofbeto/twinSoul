class Api::V1::ItemsController < ApplicationController
  include Authenticatable

  def index
    character = @current_user.characters.find(params[:character_id])
    inventory = character.inventory || character.create_inventory(user: @current_user)
    render json: inventory.items, status: :ok
  end

  def create
    character = @current_user.characters.find(params[:character_id])
    inventory = character.inventory || character.create_inventory(user: @current_user)
    item = inventory.items.build(item_params.merge(user: @current_user))
    if item.save
      render json: item, status: :created
    else
      render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    character = @current_user.characters.find(params[:character_id])
    inventory = character.inventory
    item = inventory.items.find(params[:id])
    if item.update(item_params)
      render json: item, status: :ok
    else
      render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    character = @current_user.characters.find(params[:character_id])
    inventory = character.inventory
    item = inventory.items.find(params[:id])
    item.destroy
    render json: { message: 'Item deleted' }, status: :ok
  end

  private

  def item_params
    params.permit(:name, :notes, :attunement, :consumable, categories: [])
  end
end