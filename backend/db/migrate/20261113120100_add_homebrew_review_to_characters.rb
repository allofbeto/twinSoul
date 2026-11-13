# Characters now point at the race they were built from (needed to know
# whether that race is homebrew), and carry the campaign DM's verdict on any
# homebrew content they use.
class AddHomebrewReviewToCharacters < ActiveRecord::Migration[7.0]
  def change
    add_reference :characters, :char_race, type: :uuid, foreign_key: true, null: true
    add_column :characters, :subrace_index, :string
    # nil: nothing to review (no homebrew, or not in a campaign)
    # pending / approved / rejected: the campaign DM's review state
    add_column :characters, :homebrew_status, :string
    add_column :characters, :homebrew_review_note, :text
    add_column :characters, :homebrew_reviewed_at, :datetime
    add_reference :characters, :homebrew_reviewed_by, type: :uuid, foreign_key: { to_table: :users }, null: true
  end
end
