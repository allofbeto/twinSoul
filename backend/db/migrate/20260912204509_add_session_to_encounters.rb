class AddSessionToEncounters < ActiveRecord::Migration[7.0]
  def change
    add_reference :encounters, :session, foreign_key: true, type: :uuid
  end
end
