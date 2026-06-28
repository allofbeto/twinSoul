class User < ApplicationRecord
    has_secure_password
  
    validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
    validates :first_name, presence: true
    validates :last_name, presence: true
    validates :password, length: { minimum: 6 }, if: -> { password.present? }

    has_many :characters, dependent: :destroy
    has_many :image_assets, dependent: :destroy
    has_many :items, dependent: :destroy
end
