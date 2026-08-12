class Api::V1::CampaignsController < ApplicationController
    include Authenticatable
  
    def index
      owned_ids  = @current_user.campaigns.pluck(:id)
      played_ids = Campaign.joins(:players)
                           .where(players: { user_id: @current_user.id, active: true })
                           .pluck(:id)
    
      ids       = (owned_ids + played_ids).uniq
      campaigns = Campaign.where(id: ids)
      owned_set = owned_ids.to_set
    
      json = campaigns.map do |c|
        c.as_json.merge(role: owned_set.include?(c.id) ? 'owner' : 'player')
      end
    
      render json: json, status: :ok
    end
  
    def show
      campaign = @current_user.campaigns.find(params[:id])
      render json: campaign, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Campaign not found' }, status: :not_found
    end
  
    def create
      campaign = @current_user.campaigns.build(campaign_params)
      if campaign.save
        render json: campaign, status: :created
      else
        render json: { errors: campaign.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def update
      campaign = @current_user.campaigns.find(params[:id])
      if campaign.update(campaign_params)
        render json: campaign, status: :ok
      else
        render json: { errors: campaign.errors.full_messages }, status: :unprocessable_entity
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Campaign not found' }, status: :not_found
    end
  
    def destroy
      campaign = @current_user.campaigns.find(params[:id])
      campaign.destroy
      render json: { message: 'Campaign deleted' }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Campaign not found' }, status: :not_found
    end

    def joined
      campaigns = Campaign.joins(:players).where(players: { user_id: @current_user.id, active: true })
      render json: campaigns, status: :ok
    end
  
    private
  
    def campaign_params
      params.permit(:name, :description, :status)
    end
end