class Api::V1::CharacterLevelUpsController < ApplicationController
  include Authenticatable
  wrap_parameters false

  def create
    character = @current_user.characters.find(params[:character_id])
    char_class = CharClass.selectable_by(@current_user).find_by!(index: params[:char_class_index], game: character.game)

    character.level_up!(
      char_class: char_class,
      hp_gained: params[:hp_gained].to_i,
      subclass_index: params[:subclass_index].presence,
      ability_score_changes: (params[:ability_score_changes] || {}).to_unsafe_h,
      feat: params[:feat].present? ? params.require(:feat).permit(:index, :ability).to_h : nil
    )

    render json: character.as_json(methods: [:classes, :character_class_summaries, :homebrew_summary]), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Character or class not found' }, status: :not_found
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end
end
