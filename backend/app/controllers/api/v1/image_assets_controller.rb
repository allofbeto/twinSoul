class Api::V1::ImageAssetsController < ApplicationController
    include Authenticatable
  
    def index
      render json: @current_user.image_assets, status: :ok
    end
  
    def create
      image_asset = @current_user.image_assets.build(image_asset_params)
      if image_asset.save
        render json: image_asset, status: :created
      else
        render json: { errors: image_asset.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def destroy
      image_asset = @current_user.image_assets.find(params[:id])
      image_asset.destroy
      render json: { message: 'Deleted' }, status: :ok
    end
  
    private
  
    def image_asset_params
      params.permit(:url)
    end
end