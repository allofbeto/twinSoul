class Api::V1::SessionsController < ApplicationController
    include Authenticatable
  
    def index
        if params[:campaign_id]
          sessions = @current_user.sessions.where(campaign_id: params[:campaign_id]).order(session_number: :asc)
        else
          sessions = @current_user.sessions.order(session_number: :asc)
        end
        render json: sessions, status: :ok
    end
  
    def create
      session = @current_user.sessions.build(session_params)
      if params[:campaign_id].present?
        campaign = @current_user.campaigns.find_by(id: params[:campaign_id])
        return render json: { error: 'Campaign not found' }, status: :not_found unless campaign
        session.campaign_id = campaign.id
      end
      if session.save
        render json: session, status: :created
      else
        render json: { errors: session.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def update
      session = @current_user.sessions.find(params[:id])
      attrs = session_params
      if params.key?(:campaign_id)
        if params[:campaign_id].blank?
          attrs = attrs.merge(campaign_id: nil)
        else
          campaign = @current_user.campaigns.find_by(id: params[:campaign_id])
          return render json: { error: 'Campaign not found' }, status: :not_found unless campaign
          attrs = attrs.merge(campaign_id: campaign.id)
        end
      end
      if session.update(attrs)
        render json: session, status: :ok
      else
        render json: { errors: session.errors.full_messages }, status: :unprocessable_entity
      end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Session not found' }, status: :not_found
    end
  
    def destroy
      session = @current_user.sessions.find(params[:id])
      session.destroy
      render json: { message: 'Session deleted' }, status: :ok
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Session not found' }, status: :not_found
    end
  
    private
  
    def session_params
      params.permit(:title, :notes, :session_number, :played_on)
    end
  end