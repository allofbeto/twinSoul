class AddPhaseToEncounterMonsters < ActiveRecord::Migration[7.0]
  class MigrationEncounter < ActiveRecord::Base
    self.table_name = 'encounters'
  end

  class MigrationEncounterPhase < ActiveRecord::Base
    self.table_name = 'encounter_phases'
  end

  class MigrationEncounterMonster < ActiveRecord::Base
    self.table_name = 'encounter_monsters'
  end

  def up
    add_reference :encounter_monsters, :encounter_phase, foreign_key: true, type: :uuid

    MigrationEncounter.reset_column_information
    MigrationEncounterMonster.reset_column_information

    # Every existing combatant predates phases — fold them into a single
    # "Phase 1" per encounter so nothing already built gets orphaned.
    MigrationEncounter.find_each do |encounter|
      monsters = MigrationEncounterMonster.where(encounter_id: encounter.id)
      next if monsters.none?

      phase = MigrationEncounterPhase.create!(encounter_id: encounter.id, name: 'Phase 1', position: 0)
      monsters.update_all(encounter_phase_id: phase.id)
    end

    remove_reference :encounter_monsters, :encounter, foreign_key: true, index: true
    change_column_null :encounter_monsters, :encounter_phase_id, false
  end

  def down
    add_reference :encounter_monsters, :encounter, foreign_key: true, type: :uuid

    MigrationEncounterMonster.reset_column_information
    MigrationEncounterPhase.reset_column_information

    MigrationEncounterMonster.find_each do |em|
      phase = MigrationEncounterPhase.find_by(id: em.encounter_phase_id)
      em.update_column(:encounter_id, phase&.encounter_id)
    end

    change_column_null :encounter_monsters, :encounter_id, false
    remove_reference :encounter_monsters, :encounter_phase, foreign_key: true, index: true
  end
end
