class AddOverridesToCharacters < ActiveRecord::Migration[7.0]
  def change
    change_table :characters, bulk: true do |t|
      # Table rules: hand-set values that replace what the sheet works out,
      # e.g. { "initiative" => 5, "skill:Stealth" => 9, "slots:1" => 5 }.
      t.jsonb :overrides, default: {}, null: false
      # House-rule counters: [{ id, label, total, used, recharge }].
      t.jsonb :custom_trackers, default: [], null: false
    end
  end
end
