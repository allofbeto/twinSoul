class CharRace < ApplicationRecord
  include Homebrewable

  has_many :characters, dependent: :nullify

  validates :index, presence: true, uniqueness: { scope: :game }
  validates :game, presence: true
  validates :name, presence: true

  def self.homebrew_ids_in_campaigns(campaign_ids)
    Character.where(campaign_id: campaign_ids).where.not(char_race_id: nil).select(:char_race_id)
  end

  def characters_using_this
    characters.where.not(campaign_id: nil)
  end
end
