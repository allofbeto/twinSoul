class AddTempStatsToCharacters < ActiveRecord::Migration[7.0]
  def change
    # Level and max_hp/armor_class stay the character's permanent, base
    # values (leveling up, a new suit of armor). These two cover the
    # session-scoped stuff layered on top of that: temporary hit points
    # (Aid, a healing potion's temp buffer) and a temporary AC modifier
    # (Shield, Shield of Faith) — cleared manually when the effect ends,
    # same as at a physical table.
    add_column :characters, :temp_hp, :integer, default: 0, null: false
    add_column :characters, :temp_ac_bonus, :integer, default: 0, null: false
  end
end
