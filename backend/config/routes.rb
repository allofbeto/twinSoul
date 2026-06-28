Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post 'auth/register', to: 'authentication#register'
      post 'auth/login', to: 'authentication#login'
      resources :characters do
        resource :inventory, only: [:show, :create] do
          resources :items, only: [:index, :create, :update, :destroy]
        end
      end
      resources :image_assets, only: [:index, :create, :destroy]
      resources :items
      resource :user, only: [:show, :update, :destroy] do
        patch :deactivate
        patch :close
      end
    end
  end
end