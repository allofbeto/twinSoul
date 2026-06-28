class CreateItems < ActiveRecord::Migration[7.0]
  def change
    create_table :items, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :inventory, null: true, foreign_key: true, type: :uuid

      t.string :name, null: false
      t.string :categories, array: true, default: []
      t.text :notes

      t.boolean :attunement
      t.boolean :consumable

      t.timestamps
    end
  end
end
