class CreateSpells < ActiveRecord::Migration[7.0]
  def change
    create_table :spells, id: :uuid do |t|
      t.string :game, null: false, default: 'dnd_5e'
      t.string :index, null: false
      t.string :name, null: false
      t.integer :level, null: false, default: 0 # 0 = cantrip
      t.string :school
      t.string :casting_time
      t.string :range
      t.string :components, array: true, default: []
      t.text :material
      t.string :duration
      t.boolean :concentration, null: false, default: false
      t.boolean :ritual, null: false, default: false
      t.string :attack_type
      t.text :desc, array: true, default: []
      t.text :higher_level, array: true, default: []
      # Class and subclass spell lists this spell is on (indexes).
      t.string :class_indexes, array: true, default: []
      t.string :subclass_indexes, array: true, default: []
      t.string :source, default: 'SRD 5.1'
      t.timestamps
    end
    add_index :spells, [:game, :index], unique: true
    add_index :spells, :class_indexes, using: :gin

    # The character's chosen spells: [{ index, name, level, source, prepared, custom fields... }].
    add_column :characters, :spells, :jsonb, default: [], null: false
  end
end
