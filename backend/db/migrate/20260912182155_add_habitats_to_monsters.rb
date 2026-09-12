class AddHabitatsToMonsters < ActiveRecord::Migration[7.0]
  def change
    # DMG-style environment tags (Arctic, Forest, Underdark, Planar, ...) used
    # to filter the bestiary. A monster can belong to more than one.
    add_column :monsters, :habitats, :string, array: true, default: []
    add_index :monsters, :habitats, using: 'gin'
  end
end
