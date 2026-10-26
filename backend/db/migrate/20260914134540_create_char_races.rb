class CreateCharRaces < ActiveRecord::Migration[7.0]
  def change
    create_table :char_races, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :game, null: false, default: "dnd_5e"
      t.string :index, null: false
      t.string :name, null: false
      t.integer :speed
      t.string :size
      t.text :size_description
      t.text :age
      t.text :alignment
      t.text :language_desc
      t.string :languages, array: true, default: []
      t.jsonb :ability_bonuses, default: []
      t.jsonb :traits, default: []
      t.jsonb :subraces, default: []
      t.string :source, default: "SRD 5.1"

      t.timestamps
    end
    add_index :char_races, [:game, :index], unique: true
  end
end
