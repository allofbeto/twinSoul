# The campaign DM's queue of characters whose homebrew needs a verdict.
class Api::V1::HomebrewReviewsController < ApplicationController
  include Authenticatable
  wrap_parameters false

  # GET /campaigns/:campaign_id/homebrew_reviews
  def index
    campaign = @current_user.campaigns.find(params[:campaign_id])
    characters = campaign.characters
                         .where.not(homebrew_status: nil)
                         .includes(:user, :char_race, character_classes: :char_class)
                         .order(Arel.sql("CASE homebrew_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END"), :updated_at)

    render json: characters.map { |c| review_json(c) }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  # POST /characters/:character_id/homebrew_review { decision: "approve" | "reject", note }
  def create
    character = Character.find(params[:character_id])
    unless character.campaign && character.campaign.user_id == @current_user.id
      return render json: { error: 'Only the DM of this character’s campaign can review it' }, status: :forbidden
    end
    unless character.homebrew_status
      return render json: { error: 'This character has no homebrew to review' }, status: :unprocessable_entity
    end
    unless %w[approve reject].include?(params[:decision])
      return render json: { error: 'Decision must be approve or reject' }, status: :unprocessable_entity
    end

    character.review_homebrew!(reviewer: @current_user, approve: params[:decision] == 'approve', note: params[:note])
    render json: review_json(character), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Character not found' }, status: :not_found
  end

  private

  def review_json(character)
    character.as_json(only: %i[id name race level homebrew_status homebrew_review_note homebrew_reviewed_at user_id subrace_index]).merge(
      'player_name' => "#{character.user.first_name} #{character.user.last_name.to_s[0]}.",
      'classes' => character.classes,
      'homebrew_races' => character.homebrew_races.as_json,
      'homebrew_classes' => character.homebrew_classes.as_json
    )
  end
end
