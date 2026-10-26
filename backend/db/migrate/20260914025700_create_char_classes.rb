class CreateCharClasses < ActiveRecord::Migration[7.0]
  def change
    create_table :char_classes, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :index, null: false
      t.string :name, null: false
      t.integer :hit_die, null: false
      t.string :proficiencies, array: true, default: []
      t.jsonb :proficiency_choices, default: []
      t.string :saving_throws, array: true, default: []
      t.jsonb :starting_equipment, default: []
      t.jsonb :starting_equipment_options, default: []
      t.string :spellcasting_ability
      t.jsonb :spellcasting_info, default: []
      t.jsonb :multi_classing, default: {}
      t.jsonb :subclasses, default: []
      t.jsonb :levels, default: []
      t.integer :subclass_choice_level
      t.string :source, default: "SRD 5.1"

      t.timestamps
    end
    add_index :char_classes, :index, unique: true
  end
end
