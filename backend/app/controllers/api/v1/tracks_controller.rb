class Api::V1::TracksController < ApplicationController
  include Authenticatable
  wrap_parameters false

  # Anyone in the campaign can read its soundtrack; only the owner edits it.
  def index
    campaign = Campaign.find(params[:campaign_id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless member?(campaign)

    render json: campaign.tracks.order(:created_at), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  def create
    campaign = Campaign.find(params[:campaign_id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless owner?(campaign)

    track = campaign.tracks.build(track_params.merge(user: @current_user))
    if track.save
      render json: track, status: :created
    else
      render json: { errors: track.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Campaign not found' }, status: :not_found
  end

  def update
    track = Track.find(params[:id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless owner?(track.campaign)

    if track.update(track_params)
      render json: track, status: :ok
    else
      render json: { errors: track.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Track not found' }, status: :not_found
  end

  def destroy
    track = Track.find(params[:id])
    return render json: { error: 'Forbidden' }, status: :forbidden unless owner?(track.campaign)

    track.destroy
    render json: { message: 'Track deleted' }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Track not found' }, status: :not_found
  end

  private

  def owner?(campaign)
    campaign.user_id == @current_user.id
  end

  def member?(campaign)
    owner?(campaign) || campaign.players.exists?(user_id: @current_user.id, active: true)
  end

  def track_params
    params.permit(:title, :url, :mood, :notes, refs: [:id, :kind, :name])
  end
end
