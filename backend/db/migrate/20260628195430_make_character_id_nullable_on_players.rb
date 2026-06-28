class MakeCharacterIdNullableOnPlayers < ActiveRecord::Migration[7.0]
  def change
    change_column_null :players, :character_id, true
  end
end