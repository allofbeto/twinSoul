class Track < ApplicationRecord
  belongs_to :campaign
  belongs_to :user

  validates :title, presence: true
end
