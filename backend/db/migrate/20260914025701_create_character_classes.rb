class CreateCharacterClasses < ActiveRecord::Migration[7.0]
  def change
    create_table :character_classes, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid :character_id, null: false
      t.uuid :char_class_id
      t.string :custom_name
      t.integer :level, default: 1, null: false
      t.string :subclass_index

      t.timestamps
    end

    add_index :character_classes, :character_id
    add_index :character_classes, :char_class_id
    add_index :character_classes, [:character_id, :char_class_id], unique: true,
              where: "char_class_id IS NOT NULL", name: "index_character_classes_on_character_and_class"

    add_foreign_key :character_classes, :characters
    add_foreign_key :character_classes, :char_classes
  end
end
