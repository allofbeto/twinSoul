class Api::V1::CharClassesController < ApplicationController
  include Authenticatable

  def index
    render json: CharClass.where(game: params[:game] || 'dnd_5e').order(:name), status: :ok
  end

  def show
    char_class = CharClass.find_by!(index: params[:id], game: params[:game] || 'dnd_5e')
    render json: char_class, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Class not found' }, status: :not_found
  end
end
