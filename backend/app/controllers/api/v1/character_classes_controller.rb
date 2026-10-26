class Api::V1::CharacterClassesController < ApplicationController
  include Authenticatable
  wrap_parameters false

  def create
    character = @current_user.characters.find(params[:character_id])
    character_class = character.character_classes.build(character_class_params(character.game))

    if character_class.save
      character.update!(level: character.character_classes.sum(:level))
      render json: character.as_json(methods: [:classes, :character_class_summaries]), status: :created
    else
      render json: { errors: character_class.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Character not found' }, status: :not_found
  end

  def update
    character = @current_user.characters.find(params[:character_id])
    character_class = character.character_classes.find(params[:id])

    if character_class.update(character_class_params(character.game))
      character.update!(level: character.character_classes.sum(:level))
      render json: character.as_json(methods: [:classes, :character_class_summaries]), status: :ok
    else
      render json: { errors: character_class.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Character class not found' }, status: :not_found
  end

  def destroy
    character = @current_user.characters.find(params[:character_id])
    character_class = character.character_classes.find(params[:id])
    character_class.destroy
    character.update!(level: [character.character_classes.sum(:level), 1].max)
    render json: character.as_json(methods: [:classes, :character_class_summaries]), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Character class not found' }, status: :not_found
  end

  private

  def character_class_params(game)
    permitted = params.permit(:level, :subclass_index, :char_class_index, :custom_name).to_h
    if permitted.key?('char_class_index')
      idx = permitted.delete('char_class_index')
      permitted['char_class_id'] = idx.present? ? CharClass.find_by(index: idx, game: game)&.id : nil
    end
    permitted
  end
end
