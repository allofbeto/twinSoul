class CreateImageAssets < ActiveRecord::Migration[7.0]
  def change
    create_table :image_assets, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :url, null: false

      t.timestamps
    end
  end
end