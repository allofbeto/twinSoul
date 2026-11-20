class AddActionsToCharacters < ActiveRecord::Migration[7.0]
  def change
    # The character's own attacks, spells, bonus actions and reactions:
    # [{ id, name, kind, cast_time, spell_level, attack, damage, range, notes }].
    add_column :characters, :actions, :jsonb, default: [], null: false
  end
end
