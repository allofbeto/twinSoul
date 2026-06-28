class Campaign < ApplicationRecord
    belongs_to :user
    belongs_to :inventory, optional: true

    has_many :characters, dependent: :nullify
  
    validates :name, presence: true
    validates :status, inclusion: { in: %w[active inactive archived] }
end