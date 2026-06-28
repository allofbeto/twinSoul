class AddCampaignToCharacters < ActiveRecord::Migration[7.0]
  def change
    add_reference :characters, :campaign, foreign_key: true, type: :uuid, null: true
  end
end