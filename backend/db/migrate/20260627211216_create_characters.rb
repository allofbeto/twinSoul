class CreateCharacters < ActiveRecord::Migration[7.0]
  def change
    create_table :characters, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :race, null: false
      t.integer :level, default: 1, null: false
      t.integer :max_hp, null: false
      t.integer :current_hp, null: false
      t.integer :armor_class, null: false
      t.string :game, null: false, default: 'dnd_5e'

      # Ability scores
      t.integer :strength, default: 10
      t.integer :dexterity, default: 10
      t.integer :constitution, default: 10
      t.integer :intelligence, default: 10
      t.integer :wisdom, default: 10
      t.integer :charisma, default: 10

      # Classes and skills
      t.string :classes, array: true, default: []
      t.string :skills, array: true, default: []

      t.timestamps
    end
  end
end