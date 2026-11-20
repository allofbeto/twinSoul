class AddPlayStateToCharacters < ActiveRecord::Migration[7.0]
  def change
    change_table :characters, bulk: true do |t|
      t.text :notes
      # Overrides the race's walking speed when set.
      t.integer :speed
      t.string :expertise, array: true, default: [], null: false
      t.integer :death_save_successes, default: 0, null: false
      t.integer :death_save_failures, default: 0, null: false
      # { "d10" => 2 }: hit dice spent, by die size.
      t.jsonb :hit_dice_used, default: {}, null: false
      # { "1" => 2, "pact" => 1 }: spell slots spent, by slot level.
      t.jsonb :spell_slots_used, default: {}, null: false
      # { "barbarian:rage_count" => 1 }: class resource uses spent.
      t.jsonb :resources_used, default: {}, null: false
    end
  end
end
