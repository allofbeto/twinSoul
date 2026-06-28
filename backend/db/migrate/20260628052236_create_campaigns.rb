class CreateCampaigns < ActiveRecord::Migration[7.0]
  def change
    create_table :campaigns, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :inventory, null: true, foreign_key: { to_table: :inventories }, type: :uuid

      t.string :name, null: false
      t.text :description
      t.string :status, default: 'active'

      t.timestamps
    end
  end
end