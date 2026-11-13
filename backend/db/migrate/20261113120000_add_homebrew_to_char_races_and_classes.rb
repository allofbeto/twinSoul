# Homebrew races/classes live in the same tables as the SRD reference data so
# every existing picker, feature list and level-up flow works with them
# unchanged. A row with a user_id is homebrew owned by that user; SRD rows
# keep user_id NULL.
class AddHomebrewToCharRacesAndClasses < ActiveRecord::Migration[7.0]
  def change
    %i[char_races char_classes].each do |table|
      add_reference table, :user, type: :uuid, foreign_key: true, null: true
      add_column table, :source_url, :string
      add_column table, :description, :text
    end
  end
end
