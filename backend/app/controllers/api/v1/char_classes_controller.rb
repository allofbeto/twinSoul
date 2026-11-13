class Api::V1::CharClassesController < ApplicationController
  include HomebrewCrud

  private

  def model = CharClass
  def label = 'Class'

  def normalized_attributes
    HomebrewNormalizer.class_attributes(params.fetch(:char_class, params).to_unsafe_h)
  end
end
