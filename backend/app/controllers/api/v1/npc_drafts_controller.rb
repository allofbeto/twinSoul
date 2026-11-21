# POST /npcs/draft { concept, cr?, role? }
# Has Claude draft an NPC for the builder. Nothing is saved. Limited to
# campaign owners (DMs) and to AI_DAILY_LIMIT drafts a day each.
class Api::V1::NpcDraftsController < ApplicationController
  include Authenticatable
  wrap_parameters false

  DAILY_LIMIT = ENV.fetch('AI_DAILY_LIMIT', 25).to_i

  def create
    return render json: { error: 'Only a campaign’s DM can draft NPCs.' }, status: :forbidden unless Campaign.exists?(user_id: @current_user.id)
    return render json: { error: 'AI drafting is not set up on this server yet. You can still build the NPC by hand.' }, status: :service_unavailable unless NpcGenerator.configured?

    used = Rails.cache.read(quota_key).to_i
    return render json: { error: "You've used today's #{DAILY_LIMIT} NPC drafts. They reset tomorrow." }, status: :too_many_requests if used >= DAILY_LIMIT

    npc = NpcGenerator.call(concept: params[:concept], cr: params[:cr], role: params[:role])
    Rails.cache.write(quota_key, used + 1, expires_in: 24.hours)
    render json: { npc: npc, remaining: [DAILY_LIMIT - used - 1, 0].max }, status: :ok
  rescue NpcGenerator::NotConfigured => e
    render json: { error: e.message }, status: :service_unavailable
  rescue NpcGenerator::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def quota_key
    "npc_drafts:#{@current_user.id}:#{Time.current.utc.to_date}"
  end
end
