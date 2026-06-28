class Character < ApplicationRecord
    belongs_to :user
    belongs_to :profile_image, class_name: 'ImageAsset', optional: true
    belongs_to :campaign, optional: true

    has_one :inventory, dependent: :destroy
  
    validates :name, presence: true
    validates :race, presence: true
    validates :level, numericality: { greater_than: 0, less_than_or_equal_to: 20 }
    validates :max_hp, :current_hp, :armor_class, numericality: { greater_than_or_equal_to: 0 }
    validates :game, presence: true
  end