class CreateMonsters < ActiveRecord::Migration[7.0]
  def change
    create_table :monsters, id: :uuid do |t|
      t.string :index, null: false
      t.string :name, null: false
      t.string :size
      t.string :creature_type
      t.string :alignment

      t.integer :armor_class
      t.string :armor_desc
      t.integer :hit_points
      t.string :hit_dice

      t.jsonb :speed, default: {}

      t.integer :strength
      t.integer :dexterity
      t.integer :constitution
      t.integer :intelligence
      t.integer :wisdom
      t.integer :charisma

      t.jsonb :saving_throws, default: {}
      t.jsonb :skills, default: {}

      t.string :damage_vulnerabilities, array: true, default: []
      t.string :damage_resistances, array: true, default: []
      t.string :damage_immunities, array: true, default: []
      t.string :condition_immunities, array: true, default: []

      t.jsonb :senses, default: {}
      t.string :languages

      t.string :challenge_rating
      t.float :cr_numeric
      t.integer :proficiency_bonus
      t.integer :xp

      t.jsonb :special_abilities, default: []
      t.jsonb :actions, default: []
      t.jsonb :legendary_actions, default: []
      t.jsonb :reactions, default: []

      t.string :image_url
      t.string :source, default: 'SRD 5.1'

      t.timestamps
    end

    add_index :monsters, :index, unique: true
    add_index :monsters, :name
    add_index :monsters, :cr_numeric
    add_index :monsters, :creature_type
  end
end
