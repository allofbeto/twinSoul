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
      session.campaign_id = params[:campaign_id] if params[:campaign_id].present?
      if session.save
        render json: session, status: :created
      else
        render json: { errors: session.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def update
      session = @current_user.sessions.find(params[:id])
      if session.update(session_params)
        render json: session, status: :ok
      else
        render json: { errors: session.errors.full_messages }, status: :unprocessable_entity
      end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Session not found' }, status: :not_found
    end
  
    def destroy
      campaign = @current_user.campaigns.find(params[:campaign_id])
      session = campaign.sessions.find(params[:id])
      session.destroy
      render json: { message: 'Session deleted' }, status: :ok
    end
  
    private
  
    def session_params
      params.permit(:title, :notes, :session_number, :played_on)
    end
  end