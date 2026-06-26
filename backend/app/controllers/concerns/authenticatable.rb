module Authenticatable
    extend ActiveSupport::Concern
  
    included do
      before_action :authenticate_user!
    end
  
    private
  
    def authenticate_user!
      header = request.headers['Authorization']
      raise ExceptionHandler::MissingToken, 'Missing token' unless header
  
      token = header.split(' ').last
      decoded = JsonWebToken.decode(token)
      @current_user = User.find(decoded[:user_id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'User not found' }, status: :unauthorized
    rescue ExceptionHandler::InvalidToken, ExceptionHandler::MissingToken => e
      render json: { error: e.message }, status: :unauthorized
    end
end