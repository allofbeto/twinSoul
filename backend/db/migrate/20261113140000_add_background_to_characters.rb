class AddBackgroundToCharacters < ActiveRecord::Migration[7.0]
  def change
    add_column :characters, :background, :string
  end
end
