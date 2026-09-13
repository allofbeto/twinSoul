class AddArmorClassToEncounterMonsters < ActiveRecord::Migration[7.0]
  def change
    # Snapshotted at add-time, same rationale as max_hp — the Theatre's
    # combat tracker needs it even if the source stat block changes later.
    add_column :encounter_monsters, :armor_class, :integer
  end
end
