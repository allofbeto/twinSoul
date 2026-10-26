class AddSkillsToItems < ActiveRecord::Migration[7.0]
  def change
    # Proficient 5e skill names (e.g. "Perception"), same shape as characters.skills.
    add_column :items, :skills, :string, array: true, default: []
  end
end
