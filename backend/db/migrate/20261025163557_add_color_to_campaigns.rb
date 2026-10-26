class AddColorToCampaigns < ActiveRecord::Migration[7.0]
  def change
    # Accent color ("#c9a94a"). Null means "auto" — the UI derives one from the id.
    add_column :campaigns, :color, :string
  end
end
