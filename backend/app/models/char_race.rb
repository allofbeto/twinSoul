class CharRace < ApplicationRecord
  validates :index, presence: true, uniqueness: { scope: :game }
  validates :game, presence: true
  validates :name, presence: true
end
