class Session < ApplicationRecord
    belongs_to :campaign, optional: true
    belongs_to :user
    validates :title, presence: true
end