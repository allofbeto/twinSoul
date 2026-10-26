class Campaign < ApplicationRecord
    belongs_to :user
    belongs_to :inventory, optional: true

    has_many :characters, dependent: :nullify
    has_many :items, dependent: :nullify
    has_many :players, class_name: 'Player', dependent: :destroy
    has_many :encounters, dependent: :nullify
    has_many :tracks, dependent: :destroy
  
    validates :name, presence: true
    validates :status, inclusion: { in: %w[active inactive archived] }
    validates :color, format: { with: /\A#[0-9a-fA-F]{6}\z/ }, allow_blank: true
end