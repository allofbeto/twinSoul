class AddFeatureChoicesToCharacters < ActiveRecord::Migration[7.0]
  def change
    # Picks from a class's menus (fighting styles, invocations, metamagic,
    # maneuvers, infusions): [{ id, group, index, name, source, desc }].
    add_column :characters, :feature_choices, :jsonb, default: [], null: false
  end
end
