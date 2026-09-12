class Api::V1::MonstersController < ApplicationController
  include Authenticatable

  def index
    render json: Monster.order(:name), status: :ok
  end

  def show
    monster = Monster.find(params[:id])
    render json: monster, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Monster not found' }, status: :not_found
  end
end
