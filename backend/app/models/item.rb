class Item < ApplicationRecord
    belongs_to :user
    validates :name, presence: true
    belongs_to :inventory, optional: true
    belongs_to :campaign, optional: true
    has_many :inventory_items, dependent: :destroy
end