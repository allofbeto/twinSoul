class AddLanguagesToCharacters < ActiveRecord::Migration[7.0]
  def change
    add_column :characters, :languages, :string, array: true, default: [], null: false
  end
end
