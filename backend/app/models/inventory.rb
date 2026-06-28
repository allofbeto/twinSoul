class Inventory < ApplicationRecord
    belongs_to :user
    belongs_to :character, optional: true
    has_many :items, dependent: :nullify
end