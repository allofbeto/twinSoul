class Player < ApplicationRecord
    belongs_to :user
    belongs_to :campaign, optional: true
    belongs_to :character, optional: true
  end