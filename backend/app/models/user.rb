class User < ApplicationRecord
    has_secure_password
  
    validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
    validates :first_name, presence: true
    validates :last_name, presence: true
    validates :password, length: { minimum: 6 }, if: -> { password.present? }

    has_many :characters, dependent: :destroy
    has_many :image_assets, dependent: :destroy
    has_many :items, dependent: :destroy
    has_many :campaigns, dependent: :destroy
    has_many :sessions, dependent: :destroy
    has_many :encounters, dependent: :destroy
    has_many :homebrew_races, class_name: 'CharRace', dependent: :destroy
    has_many :homebrew_classes, class_name: 'CharClass', dependent: :destroy

    # Campaigns this user runs as DM or is an active player in.
    def involved_campaign_ids
      Campaign.where(user_id: id)
              .or(Campaign.where(id: Player.where(user_id: id, active: true).select(:campaign_id)))
              .pluck(:id)
    end
end
