class CreateSessions < ActiveRecord::Migration[7.0]
  def change
    create_table :sessions, id: :uuid do |t|
      t.references :campaign, null: false, foreign_key: true, type: :uuid
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :title, null: false
      t.text :notes
      t.integer :session_number
      t.date :played_on

      t.timestamps
    end
  end
end
