class Monster < ApplicationRecord
  validates :name, presence: true
  validates :index, presence: true, uniqueness: true
end
