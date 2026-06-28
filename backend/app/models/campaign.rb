class Campaign < ApplicationRecord
    belongs_to :user
    belongs_to :inventory, optional: true
  
    validates :name, presence: true
    validates :status, inclusion: { in: %w[active inactive archived] }
end