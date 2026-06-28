class CreateInventories < ActiveRecord::Migration[7.0]
  def change
    create_table :inventories, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :character, null: true, foreign_key: true, type: :uuid

      t.timestamps
    end
  end
end
