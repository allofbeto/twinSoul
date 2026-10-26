class CreateTracks < ActiveRecord::Migration[7.0]
  def change
    # The campaign's living soundtrack: reusable tracks tagged to NPCs, places, items, characters.
    create_table :tracks, id: :uuid do |t|
      t.references :campaign, type: :uuid, null: false, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :title, null: false
      t.string :url
      t.string :mood
      t.text :notes
      # [{ id, kind, name }] — what this track is the theme for
      t.jsonb :refs, default: []
      t.timestamps
    end
  end
end
