class Api::V1::ItemsController < ApplicationController
  include Authenticatable
  wrap_parameters false

  def index
    if params[:character_id]
      character = @current_user.characters.find(params[:character_id])
      inventory = character.inventory || character.create_inventory(user: @current_user)
      render json: inventory.items, status: :ok
    else
      render json: @current_user.items, status: :ok
    end
  end

  def show
    item = @current_user.items.find(params[:id])
    render json: item, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Item not found' }, status: :not_found
  end

  def create
    character = @current_user.characters.find(params[:character_id])
    inventory = character.inventory || character.create_inventory(user: @current_user)
    campaign_id = character.campaign_id
    item = inventory.items.build(item_params.merge(user: @current_user, campaign_id: campaign_id))
    if item.save
      render json: item, status: :created
    else
      render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if params[:character_id]
      character = @current_user.characters.find(params[:character_id])
      inventory = character.inventory
      item = inventory.items.find(params[:id])
    else
      item = @current_user.items.find(params[:id])
    end
  
    if item.update(item_params)
      render json: item, status: :ok
    else
      render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
    end
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Item not found' }, status: :not_found
  end

  def destroy
    character = @current_user.characters.find(params[:character_id])
    inventory = character.inventory
    item = inventory.items.find(params[:id])
    item.destroy
    render json: { message: 'Item deleted' }, status: :ok
  end

  # Items the DM has put in play for this campaign (theatre tray).
  def campaign_items
    campaign = Campaign.find(params[:campaign_id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless member?(campaign)

    render json: Item.where(campaign_id: campaign.id), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  # DM drops loose loot/gear straight into the campaign, no character attached.
  def create_campaign_item
    campaign = Campaign.find(params[:campaign_id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless owner?(campaign)

    item = Item.new(item_params.merge(user: @current_user, campaign_id: campaign.id))
    if item.save
      render json: item, status: :created
    else
      render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  private

  def owner?(campaign)
    campaign.user_id == @current_user.id
  end

  def member?(campaign)
    owner?(campaign) || campaign.players.exists?(user_id: @current_user.id, active: true)
  end

  def item_params
    params.permit(:name, :notes, :attunement, :consumable, :campaign_id, categories: [])
  end
end