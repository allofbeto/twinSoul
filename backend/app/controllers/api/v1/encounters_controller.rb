class Api::V1::EncountersController < ApplicationController
  include Authenticatable
  wrap_parameters false

  JSON_INCLUDES = { encounter_phases: { include: :encounter_monsters } }.freeze

  def index
    scope = @current_user.encounters.includes(encounter_phases: :encounter_monsters).order(created_at: :desc)
    scope = scope.where(campaign_id: params[:campaign_id]) if params[:campaign_id]
    scope = scope.where(session_id: params[:session_id]) if params[:session_id]
    render json: scope.as_json(include: JSON_INCLUDES), status: :ok
  end

  def show
    encounter = @current_user.encounters.find(params[:id])
    render json: encounter.as_json(include: JSON_INCLUDES), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Encounter not found' }, status: :not_found
  end

  def create
    encounter = @current_user.encounters.build(encounter_params)
    if encounter.save
      render json: encounter.as_json(include: JSON_INCLUDES), status: :created
    else
      render json: { errors: encounter.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    encounter = @current_user.encounters.find(params[:id])
    if encounter.update(encounter_params)
      render json: encounter.as_json(include: JSON_INCLUDES), status: :ok
    else
      render json: { errors: encounter.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Encounter not found' }, status: :not_found
  end

  def destroy
    encounter = @current_user.encounters.find(params[:id])
    encounter.destroy
    render json: { message: 'Encounter deleted' }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Encounter not found' }, status: :not_found
  end

  private

  def encounter_params
    params.permit(
      :name, :notes, :campaign_id, :session_id,
      encounter_phases_attributes: [
        :id, :name, :position, :notes, :_destroy,
        encounter_monsters_attributes: [
          :id, :monster_id, :item_id, :name, :challenge_rating, :xp, :quantity, :notes, :_destroy
        ]
      ]
    )
  end
end
