# Battle maps are DM material: only the campaign owner can read or change them.
# Players will receive a filtered view through the table channel instead.
class Api::V1::BattleMapsController < ApplicationController
  include Authenticatable
  wrap_parameters false

  # GET /campaigns/:campaign_id/battle_maps — library list, without the heavy grid.
  def index
    campaign = Campaign.find(params[:campaign_id])
    return forbidden unless owner?(campaign)

    maps = campaign.battle_maps.order(updated_at: :desc)
    maps = maps.where(session_id: params[:session_id]) if params[:session_id].present?
    render json: maps.map { |m| summary(m) }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  def show
    map = BattleMap.find(params[:id])
    return forbidden unless owner?(map.campaign)

    render json: map, status: :ok
  rescue ActiveRecord::RecordNotFound
    not_found
  end

  def create
    campaign = Campaign.find(params[:campaign_id])
    return forbidden unless owner?(campaign)

    attrs = map_params
    width = attrs[:width].to_i
    height = attrs[:height].to_i
    attrs[:cells] = BattleMap.blank_cells(width, height, attrs.delete(:fill).presence || 'g') if attrs[:cells].blank?
    if attrs[:session_id].present? && !Session.exists?(id: attrs[:session_id], campaign_id: campaign.id)
      return render json: { errors: ['Session is not in this campaign'] }, status: :unprocessable_entity
    end

    map = campaign.battle_maps.build(attrs.merge(user: @current_user))
    if map.save
      render json: map, status: :created
    else
      render json: { errors: map.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  def update
    map = BattleMap.find(params[:id])
    return forbidden unless owner?(map.campaign)

    attrs = map_params.except(:fill)
    if attrs.key?(:session_id) && attrs[:session_id].present? && !Session.exists?(id: attrs[:session_id], campaign_id: map.campaign_id)
      return render json: { errors: ['Session is not in this campaign'] }, status: :unprocessable_entity
    end

    if map.update(attrs)
      render json: map, status: :ok
    else
      render json: { errors: map.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    not_found
  end

  def destroy
    map = BattleMap.find(params[:id])
    return forbidden unless owner?(map.campaign)

    map.destroy
    render json: { message: 'Battle map deleted' }, status: :ok
  rescue ActiveRecord::RecordNotFound
    not_found
  end

  # POST /battle_maps/interpret { text, answers, asking } — the dungeon helper
  # reading free text. DMs only, with a daily cap like NPC drafts.
  def interpret
    return forbidden unless Campaign.exists?(user_id: @current_user.id)
    return render json: { error: 'The helper can’t read free text on this server yet.' }, status: :service_unavailable unless MapHelperReader.configured?

    used = Rails.cache.read(helper_quota_key).to_i
    return render json: { error: "That's today's #{HELPER_DAILY_LIMIT} helper messages. The buttons still work." }, status: :too_many_requests if used >= HELPER_DAILY_LIMIT

    answers = params[:answers].respond_to?(:to_unsafe_h) ? params[:answers].to_unsafe_h : {}
    result = MapHelperReader.call(text: params[:text], answers: answers, asking: params[:asking])
    Rails.cache.write(helper_quota_key, used + 1, expires_in: 24.hours)
    render json: result, status: :ok
  rescue MapHelperReader::NotConfigured => e
    render json: { error: e.message }, status: :service_unavailable
  rescue MapHelperReader::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  HELPER_DAILY_LIMIT = ENV.fetch('MAP_HELPER_DAILY_LIMIT', 200).to_i

  def helper_quota_key
    "map_helper:#{@current_user.id}:#{Time.current.utc.to_date}"
  end

  def owner?(campaign)
    campaign.user_id == @current_user.id
  end

  def forbidden
    render json: { error: 'Forbidden' }, status: :forbidden
  end

  def not_found
    render json: { error: 'Battle map not found' }, status: :not_found
  end

  def summary(map)
    map.as_json(only: %i[id campaign_id session_id name grid width height lighting template updated_at])
       .merge('cells' => map.cells) # small enough for library thumbnails (≤ 2.4 KB)
  end

  def map_params
    permitted = params.permit(:name, :grid, :width, :height, :lighting, :template, :session_id, :fill, cells: [])
    permitted[:props] = params[:props].to_unsafe_h if params[:props].respond_to?(:to_unsafe_h)
    permitted[:settings] = params[:settings].to_unsafe_h if params[:settings].respond_to?(:to_unsafe_h)
    permitted
  end
end
