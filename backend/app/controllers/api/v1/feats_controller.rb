class Api::V1::FeatsController < ApplicationController
  include Authenticatable

  def index
    render json: Feat.where(game: params[:game].presence || 'dnd_5e').order(:name), status: :ok
  end
end
