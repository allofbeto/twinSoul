class AddStatsToItems < ActiveRecord::Migration[7.0]
  def change
    add_column :items, :armor_class, :integer, default: 10
    add_column :items, :max_hp, :integer, default: 10
    add_column :items, :current_hp, :integer, default: 10
    add_column :items, :challenge_rating, :string
    add_column :items, :disposition, :string, default: "neutral"
    add_column :items, :strength, :integer, default: 10
    add_column :items, :dexterity, :integer, default: 10
    add_column :items, :constitution, :integer, default: 10
    add_column :items, :intelligence, :integer, default: 10
    add_column :items, :wisdom, :integer, default: 10
    add_column :items, :charisma, :integer, default: 10
  end
end
