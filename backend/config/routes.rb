Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post 'auth/register', to: 'authentication#register'
      post 'auth/login', to: 'authentication#login'
      resources :image_assets, only: [:index, :create, :destroy]
    end
  end
end