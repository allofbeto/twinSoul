class AddedColUsersActivAndClosed < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :active, :boolean, default: true, null: false
    add_column :users, :closed, :boolean, default: false, null: false
    add_column :users, :deactivated_at, :datetime
  end
end
