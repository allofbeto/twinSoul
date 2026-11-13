class AddIconsAndFeats < ActiveRecord::Migration[7.0]
  def change
    # Homebrew races/classes can borrow one of the drawn icons.
    add_column :char_races, :icon, :string
    add_column :char_classes, :icon, :string

    # Feat catalog (shared reference data, like races and classes).
    create_table :feats, id: :uuid do |t|
      t.string :game, null: false, default: 'dnd_5e'
      t.string :index, null: false
      t.string :name, null: false
      t.string :source
      t.string :prerequisite
      t.jsonb :desc, null: false, default: []
      # Abilities the feat can raise by `ability_bonus` (player picks one).
      t.jsonb :ability_options, null: false, default: []
      t.integer :ability_bonus, null: false, default: 0
      t.timestamps
    end
    add_index :feats, [:game, :index], unique: true

    # Feats a character has taken: [{ index, name, ability, taken_at }].
    add_column :characters, :feats, :jsonb, null: false, default: []
  end
end
