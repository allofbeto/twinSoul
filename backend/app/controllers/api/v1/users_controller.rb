class Api::V1::UsersController < ApplicationController
    include Authenticatable
  
    def show
      render json: user_response(@current_user), status: :ok
    end
  
    def update
      if @current_user.update(user_params)
        render json: user_response(@current_user), status: :ok
      else
        render json: { errors: @current_user.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def deactivate
      @current_user.update(active: false, deactivated_at: Time.current)
      render json: { message: 'Account deactivated' }, status: :ok
    end
  
    def close
      @current_user.update(closed: true, deactivated_at: Time.current)
      render json: { message: 'Account closed' }, status: :ok
    end
  
    def destroy
      @current_user.destroy
      render json: { message: 'Account deleted' }, status: :ok
    end
  
    private
  
    def user_params
      params.permit(:first_name, :last_name, :email, :phone, :password)
    end
  
    def user_response(user)
      {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        active: user.active,
        closed: user.closed,
        deactivated_at: user.deactivated_at,
        theme: user.theme
      }
    end
end