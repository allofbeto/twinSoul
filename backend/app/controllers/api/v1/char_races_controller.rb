class Api::V1::CharRacesController < ApplicationController
  include HomebrewCrud

  private

  def model = CharRace
  def label = 'Race'

  def normalized_attributes
    HomebrewNormalizer.race_attributes(params.fetch(:char_race, params).to_unsafe_h)
  end
end
