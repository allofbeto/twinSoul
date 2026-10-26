class Api::V1::ItemsController < ApplicationController
  # One shape for every action-economy entry; attacks fill in the roll fields.
  FEATURE_KEYS = [:name, :desc, :attack_bonus, :damage, :damage_type, :range, :save, :uses,
                  :attack_ability, :attack_proficient, :attack_die, :attack_roll,
                  :damage_mode, :damage_dice_count, :damage_dice_sides, :damage_bonus,
                  :damage_ability, :damage_flat, :save_ability, :save_dc, :save_dc_ability,
                  :roll_kind, :check_with, :roll_bonus, :roll_expr, :roll_label,
                  { damages: [:mode, :dice_count, :dice_sides, :bonus, :ability, :flat, :text, :type] }].freeze

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
    if params[:character_id]
      character = @current_user.characters.find(params[:character_id])
      inventory = character.inventory
      item = inventory.items.find(params[:id])
    else
      item = @current_user.items.find(params[:id])
    end

    item.destroy
    render json: { message: 'Item deleted' }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Item not found' }, status: :not_found
  end

  # Items the DM has put in play for this campaign (theatre tray).
  # DMs see everything; other members get monsters redacted down to
  # whatever sections the DM has marked player-visible (none, by default).
  def campaign_items
    campaign = Campaign.find(params[:campaign_id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless member?(campaign)

    items = Item.where(campaign_id: campaign.id)
    if owner?(campaign)
      render json: items, status: :ok
    else
      visible = items.select { |item| item.kind != 'monster' || item.any_section_visible? }
      render json: visible.map { |item| item.kind == 'monster' ? item.player_view : item }, status: :ok
    end
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
    params.permit(:name, :notes, :attunement, :consumable, :campaign_id, :kind, :image_url,
      :armor_class, :max_hp, :current_hp, :temp_hp, :challenge_rating, :disposition,
      :strength, :dexterity, :constitution, :intelligence, :wisdom, :charisma,
      :speed, :senses, :languages, :defenses,
      categories: [], visible_sections: [], skills: [], saving_throws: [],
      traits: FEATURE_KEYS, actions: FEATURE_KEYS, bonus_actions: FEATURE_KEYS,
      reactions: FEATURE_KEYS, legendary_actions: FEATURE_KEYS,
      spells: [:name, :level, :uses, :concentration, :desc],
      equipment: [:name, :qty, :desc],
      spellcasting: [:ability, { slots: {} }])
  end
end