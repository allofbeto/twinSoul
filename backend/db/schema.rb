# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2026_06_27_232419) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
  enable_extension "plpgsql"

  create_table "characters", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.string "race", null: false
    t.integer "level", default: 1, null: false
    t.integer "max_hp", null: false
    t.integer "current_hp", null: false
    t.integer "armor_class", null: false
    t.string "game", default: "dnd_5e", null: false
    t.integer "strength", default: 10
    t.integer "dexterity", default: 10
    t.integer "constitution", default: 10
    t.integer "intelligence", default: 10
    t.integer "wisdom", default: 10
    t.integer "charisma", default: 10
    t.string "classes", default: [], array: true
    t.string "skills", default: [], array: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "profile_image_id"
    t.index ["profile_image_id"], name: "index_characters_on_profile_image_id"
    t.index ["user_id"], name: "index_characters_on_user_id"
  end

  create_table "image_assets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "url", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_image_assets_on_user_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "phone"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "active", default: true, null: false
    t.boolean "closed", default: false, null: false
    t.datetime "deactivated_at"
    t.string "theme", default: "default", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "characters", "image_assets", column: "profile_image_id"
  add_foreign_key "characters", "users"
  add_foreign_key "image_assets", "users"
end
