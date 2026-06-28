class AddedColCharacterGoldInspo < ActiveRecord::Migration[7.0]
  def change
    add_column :characters, :gold, :integer, default: 0
    add_column :characters, :inspo, :integer, default: 0
  end
end
