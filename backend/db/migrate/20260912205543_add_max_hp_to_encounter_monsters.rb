class AddMaxHpToEncounterMonsters < ActiveRecord::Migration[7.0]
  def change
    # Snapshotted at add-time (same rationale as challenge_rating/xp) so the
    # Theatre's initiative tracker has something to show, even if the source
    # stat block changes or is deleted later.
    add_column :encounter_monsters, :max_hp, :integer
  end
end
