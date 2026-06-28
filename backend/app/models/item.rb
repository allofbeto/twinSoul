class Item < ApplicationRecord
    belongs_to :user
    validates :name, presence: true
    belongs_to :inventory, optional: true
end