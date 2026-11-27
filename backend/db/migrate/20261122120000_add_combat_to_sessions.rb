# The initiative tracker's state (order, turn, round, HP, statuses, spent
# resources) lives on the session so it survives a reload, until the DM ends combat.
class AddCombatToSessions < ActiveRecord::Migration[7.0]
  def change
    add_column :sessions, :combat, :jsonb
  end
end
