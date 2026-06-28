class CreatePlayers < ActiveRecord::Migration[7.0]
  def change
    create_table :players, id: :uuid do |t|

      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :character, null: false, foreign_key: true, type: :uuid
      t.references :campaign, null: false, foreign_key: true, type: :uuid

      t.boolean :active

      t.timestamps
    end
  end
end
