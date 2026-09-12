class AddVisibilityAndStatBlockSectionsToItems < ActiveRecord::Migration[7.0]
  def change
    add_column :items, :traits, :jsonb, default: []
    add_column :items, :actions, :jsonb, default: []
    add_column :items, :legendary_actions, :jsonb, default: []

    # Which stat block sections (see Item::VISIBILITY_SECTIONS) a DM has
    # marked as player-visible. Empty by default: DM-only until revealed.
    add_column :items, :visible_sections, :string, array: true, default: []
  end
end
