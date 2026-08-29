module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      token = request.params[:token]
      decoded = JsonWebToken.decode(token)
      User.find(decoded[:user_id])
    rescue ActiveRecord::RecordNotFound, JWT::DecodeError, ExceptionHandler::InvalidToken, TypeError
      reject_unauthorized_connection
    end
  end
end
