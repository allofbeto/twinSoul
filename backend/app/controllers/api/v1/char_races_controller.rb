class Api::V1::CharRacesController < ApplicationController
  include Authenticatable

  def index
    render json: CharRace.where(game: params[:game] || 'dnd_5e').order(:name), status: :ok
  end

  def show
    char_race = CharRace.find_by!(index: params[:id], game: params[:game] || 'dnd_5e')
    render json: char_race, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Race not found' }, status: :not_found
  end
end
