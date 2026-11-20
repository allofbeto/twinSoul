class Spell < ApplicationRecord
  validates :index, presence: true, uniqueness: { scope: :game }
  validates :name, presence: true
  validates :level, inclusion: { in: 0..9 }
end
