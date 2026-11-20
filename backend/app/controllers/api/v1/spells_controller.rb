class Api::V1::SpellsController < ApplicationController
  include Authenticatable

  FIELDS = %i[index name level school casting_time range components material duration
              concentration ritual attack_type desc higher_level class_indexes subclass_indexes source].freeze

  # The whole list in one go (a few hundred rows); the frontend caches it.
  def index
    spells = Spell.where(game: params[:game].presence || 'dnd_5e').order(:level, :name).select(:id, *FIELDS)
    render json: spells.as_json(only: FIELDS), status: :ok
  end
end
