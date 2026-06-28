class AddedRefCharactersProfileImage < ActiveRecord::Migration[7.0]
  def change
    add_reference :characters, :profile_image, foreign_key: { to_table: :image_assets }, type: :uuid, null: true
  end
end