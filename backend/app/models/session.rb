class Session < ApplicationRecord
    belongs_to :campaign, optional: true
    belongs_to :user
    has_many :encounters, dependent: :nullify
    validates :title, presence: true
end