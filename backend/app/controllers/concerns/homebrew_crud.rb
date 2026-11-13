# Index/show/create/update/destroy for a Homebrewable reference table.
# Reads cover SRD rows plus any homebrew the user can see; writes only ever
# touch the current user's own homebrew.
module HomebrewCrud
  extend ActiveSupport::Concern

  included do
    include Authenticatable
    wrap_parameters false
  end

  def index
    render json: scope.where(game: game).order(Arel.sql('user_id IS NOT NULL'), :name), status: :ok
  end

  def show
    render json: scope.find_by!(index: params[:id], game: game), status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { error: "#{label} not found" }, status: :not_found
  end

  def create
    record = model.new(normalized_attributes.merge(user: @current_user, game: game))
    if record.save
      render json: record, status: :created
    else
      render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    record = own_homebrew.find_by!(index: params[:id])
    if record.update(normalized_attributes)
      render json: record, status: :ok
    else
      render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: "#{label} not found" }, status: :not_found
  end

  def destroy
    record = own_homebrew.find_by!(index: params[:id])
    if record.destroy
      render json: { message: "#{label} deleted" }, status: :ok
    else
      render json: { errors: record.errors.full_messages.presence || ["#{label} is still used by a character"] }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: "#{label} not found" }, status: :not_found
  end

  private

  def scope
    model.visible_to(@current_user)
  end

  def own_homebrew
    model.where(user_id: @current_user.id)
  end

  def game
    params[:game].presence || 'dnd_5e'
  end
end
