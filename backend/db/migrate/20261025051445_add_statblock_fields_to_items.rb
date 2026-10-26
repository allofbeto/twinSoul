class AddStatblockFieldsToItems < ActiveRecord::Migration[7.0]
  def change
    # Action economy beyond the existing traits / actions / legendary_actions.
    add_column :items, :bonus_actions, :jsonb, default: []
    add_column :items, :reactions, :jsonb, default: []
    # Known spells: [{ name, level, uses, concentration, desc }]
    add_column :items, :spells, :jsonb, default: []
    # { ability: "intelligence", slots: { "1" => 4, "2" => 3 } }
    add_column :items, :spellcasting, :jsonb, default: {}
    # Carried gear: [{ name, qty, desc }]
    add_column :items, :equipment, :jsonb, default: []
    # Proficient saving throws, as ability keys ("dexterity")
    add_column :items, :saving_throws, :string, array: true, default: []
    add_column :items, :speed, :string
    add_column :items, :senses, :string
    add_column :items, :languages, :string
    # Resistances / immunities / vulnerabilities, free text
    add_column :items, :defenses, :text
  end
end
