Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post 'auth/login', to: 'authentication#login'
      post 'auth/register', to: 'authentication#register'
      get 'campaigns/:campaign_id/players/:id/profile', to: 'players#profile'
      get 'campaigns/joined', to: 'campaigns#joined'
      post 'characters/:id/migrate_inventory', to: 'characters#migrate_inventory'
      get 'users/search', to: 'users#search'
      resources :campaigns do
        resources :players, only: [:index, :show, :create, :update, :destroy] do
        end
      end
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