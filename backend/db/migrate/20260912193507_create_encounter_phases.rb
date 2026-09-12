class CreateEncounterPhases < ActiveRecord::Migration[7.0]
  def change
    create_table :encounter_phases, id: :uuid do |t|
      t.references :encounter, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false, default: 'Phase 1'
      t.integer :position, null: false, default: 0
      # e.g. "Triggers when the boss drops below half HP" — the escalation cue.
      t.text :notes

      t.timestamps
    end
  end
end
