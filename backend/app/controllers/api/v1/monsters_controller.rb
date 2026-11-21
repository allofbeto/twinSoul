class Api::V1::MonstersController < ApplicationController
  include Authenticatable

  # ?slim=1 returns just what a picker needs, not every stat block.
  SLIM_FIELDS = %i[id index name size creature_type challenge_rating cr_numeric armor_class hit_points dexterity image_url].freeze

  def index
    monsters = Monster.order(:name)
    monsters = monsters.select(*SLIM_FIELDS) if params[:slim].present?
    render json: monsters, status: :ok
  end

  def show
    monster = Monster.find(params[:id])
    render json: monster, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Monster not found' }, status: :not_found
  end
end
