class CreateEncounterMonsters < ActiveRecord::Migration[7.0]
  def change
    create_table :encounter_monsters, id: :uuid do |t|
      t.references :encounter, null: false, foreign_key: true, type: :uuid
      # Optional links back to the source stat block: bestiary Monster or a
      # homebrew Item (kind monster/npc). Nil for a quick, custom combatant.
      t.references :monster, foreign_key: true, type: :uuid
      t.references :item, foreign_key: true, type: :uuid

      # Snapshotted at add-time so the encounter's math stays stable even if
      # the source stat block changes later or is deleted.
      t.string :name, null: false
      t.string :challenge_rating
      t.integer :xp, default: 0
      t.integer :quantity, default: 1, null: false
      t.text :notes

      t.timestamps
    end
  end
end
