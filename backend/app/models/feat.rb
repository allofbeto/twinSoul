class Feat < ApplicationRecord
  validates :index, presence: true, uniqueness: { scope: :game }
  validates :name, presence: true
end
