class Api::V1::AuthenticationController < ApplicationController
    def register
      user = User.new(user_params)
      if user.save
        token = JsonWebToken.encode(user_id: user.id)
        render json: { token: token, user: user_response(user) }, status: :created
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def login
      user = User.find_by(email: user_params[:email])
      if user&.authenticate(user_params[:password])
        token = JsonWebToken.encode(user_id: user.id)
        render json: { token: token, user: user_response(user) }, status: :ok
      else
        render json: { error: 'Invalid email or password' }, status: :unauthorized
      end
    end
  
    private
  
    def user_params
      params.permit(:first_name, :last_name, :email, :password, :phone)
    end
  
    def user_response(user)
      {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone
      }
    end
end