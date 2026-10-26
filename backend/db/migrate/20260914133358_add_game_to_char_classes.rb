class AddGameToCharClasses < ActiveRecord::Migration[7.0]
  def change
    add_column :char_classes, :game, :string, null: false, default: "dnd_5e"

    remove_index :char_classes, :index
    add_index :char_classes, [:game, :index], unique: true
  end
end
