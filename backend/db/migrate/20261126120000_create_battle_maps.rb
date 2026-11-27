class CreateBattleMaps < ActiveRecord::Migration[7.0]
  def change
    create_table :battle_maps, id: :uuid do |t|
      t.uuid :campaign_id, null: false
      t.uuid :user_id, null: false
      # Set for maps made on the fly for a session's random fight.
      t.uuid :session_id
      t.string :name, null: false
      t.string :grid, null: false, default: 'square'
      t.integer :width, null: false
      t.integer :height, null: false
      # One string per row, one terrain code per cell.
      t.jsonb :cells, null: false, default: []
      # Per-cell settings keyed "x,y": door state, trap DCs, pit depth, light radius...
      t.jsonb :props, null: false, default: {}
      t.string :lighting, null: false, default: 'bright'
      # Rule overrides and table settings (diagonals, vision mode...).
      t.jsonb :settings, null: false, default: {}
      t.boolean :template, null: false, default: false
      t.timestamps
    end
    add_index :battle_maps, :campaign_id
    add_index :battle_maps, :session_id
    add_index :battle_maps, :user_id
  end
end
