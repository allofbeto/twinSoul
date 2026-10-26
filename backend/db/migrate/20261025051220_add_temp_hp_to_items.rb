class AddTempHpToItems < ActiveRecord::Migration[7.0]
  def change
    add_column :items, :temp_hp, :integer, default: 0, null: false
  end
end
