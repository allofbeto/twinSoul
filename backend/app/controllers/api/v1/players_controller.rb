class Api::V1::PlayersController < ApplicationController
    include Authenticatable
  
    def index
      campaign = @current_user.campaigns.find(params[:campaign_id])
      render json: campaign.players.includes(:user, :character).map { |p|
        p.as_json.merge(
          user_name: "#{p.user.first_name} #{p.user.last_name[0]}.",
          user_email: p.user.email,
          character: p.character&.as_json(only: [:id, :name, :race, :level])
        )
      }, status: :ok
    end
  
    def show
      campaign = @current_user.campaigns.find(params[:campaign_id])
      player = campaign.players.find(params[:id])
      render json: player, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Player not found' }, status: :not_found
    end
  
    def create
      campaign = @current_user.campaigns.find(params[:campaign_id])
      user = User.find(params[:user_id])
      player = campaign.players.build(character_id: params[:character_id], user: user, active: true)
      if player.save
        render json: player, status: :created
      else
        render json: { errors: player.errors.full_messages }, status: :unprocessable_entity
      end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'User not found' }, status: :not_found
    end

    def profile
      campaign = Campaign.find(params[:campaign_id])
      player = campaign.players.find(params[:id])
      user = player.user
      characters = user.characters.where(campaign_id: campaign.id)
      render json: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
        characters: characters.as_json(include: { profile_image: { only: [:id, :url] } })
      }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Not found' }, status: :not_found
    end
  
    def update
      campaign = @current_user.campaigns.find(params[:campaign_id])
      player = campaign.players.find(params[:id])
      if player.update(player_params)
        render json: player, status: :ok
      else
        render json: { errors: player.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Player not found' }, status: :not_found
    end
  
    def destroy
      campaign = @current_user.campaigns.find(params[:campaign_id])
      player = campaign.players.find(params[:id])
      player.destroy
      render json: { message: 'Player removed' }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Player not found' }, status: :not_found
    end
  
    private
  
    def player_params
      params.permit(:character_id)
    end
end