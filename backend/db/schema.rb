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

ActiveRecord::Schema[7.0].define(version: 2026_09_14_022916) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
  enable_extension "plpgsql"

  create_table "campaigns", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "inventory_id"
    t.string "name", null: false
    t.text "description"
    t.string "status", default: "active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["inventory_id"], name: "index_campaigns_on_inventory_id"
    t.index ["user_id"], name: "index_campaigns_on_user_id"
  end

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
    t.integer "gold", default: 0
    t.integer "inspo", default: 0
    t.uuid "campaign_id"
    t.integer "temp_hp", default: 0, null: false
    t.integer "temp_ac_bonus", default: 0, null: false
    t.index ["campaign_id"], name: "index_characters_on_campaign_id"
    t.index ["profile_image_id"], name: "index_characters_on_profile_image_id"
    t.index ["user_id"], name: "index_characters_on_user_id"
  end

  create_table "encounter_monsters", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "monster_id"
    t.uuid "item_id"
    t.string "name", null: false
    t.string "challenge_rating"
    t.integer "xp", default: 0
    t.integer "quantity", default: 1, null: false
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "encounter_phase_id", null: false
    t.integer "max_hp"
    t.integer "armor_class"
    t.index ["encounter_phase_id"], name: "index_encounter_monsters_on_encounter_phase_id"
    t.index ["item_id"], name: "index_encounter_monsters_on_item_id"
    t.index ["monster_id"], name: "index_encounter_monsters_on_monster_id"
  end

  create_table "encounter_phases", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "encounter_id", null: false
    t.string "name", default: "Phase 1", null: false
    t.integer "position", default: 0, null: false
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["encounter_id"], name: "index_encounter_phases_on_encounter_id"
  end

  create_table "encounters", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "campaign_id"
    t.string "name", null: false
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "session_id"
    t.index ["campaign_id"], name: "index_encounters_on_campaign_id"
    t.index ["session_id"], name: "index_encounters_on_session_id"
    t.index ["user_id"], name: "index_encounters_on_user_id"
  end

  create_table "image_assets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "url", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_image_assets_on_user_id"
  end

  create_table "inventories", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "character_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id"], name: "index_inventories_on_character_id"
    t.index ["user_id"], name: "index_inventories_on_user_id"
  end

  create_table "items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "inventory_id"
    t.string "name", null: false
    t.string "categories", default: [], array: true
    t.text "notes"
    t.boolean "attunement"
    t.boolean "consumable"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "campaign_id"
    t.string "kind", default: "item", null: false
    t.string "image_url"
    t.integer "armor_class", default: 10
    t.integer "max_hp", default: 10
    t.integer "current_hp", default: 10
    t.string "challenge_rating"
    t.string "disposition", default: "neutral"
    t.integer "strength", default: 10
    t.integer "dexterity", default: 10
    t.integer "constitution", default: 10
    t.integer "intelligence", default: 10
    t.integer "wisdom", default: 10
    t.integer "charisma", default: 10
    t.jsonb "traits", default: []
    t.jsonb "actions", default: []
    t.jsonb "legendary_actions", default: []
    t.string "visible_sections", default: [], array: true
    t.index ["campaign_id"], name: "index_items_on_campaign_id"
    t.index ["inventory_id"], name: "index_items_on_inventory_id"
    t.index ["user_id"], name: "index_items_on_user_id"
  end

  create_table "monsters", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "index", null: false
    t.string "name", null: false
    t.string "size"
    t.string "creature_type"
    t.string "alignment"
    t.integer "armor_class"
    t.string "armor_desc"
    t.integer "hit_points"
    t.string "hit_dice"
    t.jsonb "speed", default: {}
    t.integer "strength"
    t.integer "dexterity"
    t.integer "constitution"
    t.integer "intelligence"
    t.integer "wisdom"
    t.integer "charisma"
    t.jsonb "saving_throws", default: {}
    t.jsonb "skills", default: {}
    t.string "damage_vulnerabilities", default: [], array: true
    t.string "damage_resistances", default: [], array: true
    t.string "damage_immunities", default: [], array: true
    t.string "condition_immunities", default: [], array: true
    t.jsonb "senses", default: {}
    t.string "languages"
    t.string "challenge_rating"
    t.float "cr_numeric"
    t.integer "proficiency_bonus"
    t.integer "xp"
    t.jsonb "special_abilities", default: []
    t.jsonb "actions", default: []
    t.jsonb "legendary_actions", default: []
    t.jsonb "reactions", default: []
    t.string "image_url"
    t.string "source", default: "SRD 5.1"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "habitats", default: [], array: true
    t.index ["cr_numeric"], name: "index_monsters_on_cr_numeric"
    t.index ["creature_type"], name: "index_monsters_on_creature_type"
    t.index ["habitats"], name: "index_monsters_on_habitats", using: :gin
    t.index ["index"], name: "index_monsters_on_index", unique: true
    t.index ["name"], name: "index_monsters_on_name"
  end

  create_table "players", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "character_id"
    t.uuid "campaign_id", null: false
    t.boolean "active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id"], name: "index_players_on_campaign_id"
    t.index ["character_id"], name: "index_players_on_character_id"
    t.index ["user_id"], name: "index_players_on_user_id"
  end

  create_table "sessions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "campaign_id"
    t.uuid "user_id", null: false
    t.string "title", null: false
    t.text "notes"
    t.integer "session_number"
    t.date "played_on"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["campaign_id"], name: "index_sessions_on_campaign_id"
    t.index ["user_id"], name: "index_sessions_on_user_id"
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

  add_foreign_key "campaigns", "inventories"
  add_foreign_key "campaigns", "users"
  add_foreign_key "characters", "campaigns"
  add_foreign_key "characters", "image_assets", column: "profile_image_id"
  add_foreign_key "characters", "users"
  add_foreign_key "encounter_monsters", "encounter_phases"
  add_foreign_key "encounter_monsters", "items"
  add_foreign_key "encounter_monsters", "monsters"
  add_foreign_key "encounter_phases", "encounters"
  add_foreign_key "encounters", "campaigns"
  add_foreign_key "encounters", "sessions"
  add_foreign_key "encounters", "users"
  add_foreign_key "image_assets", "users"
  add_foreign_key "inventories", "characters"
  add_foreign_key "inventories", "users"
  add_foreign_key "items", "campaigns"
  add_foreign_key "items", "inventories"
  add_foreign_key "items", "users"
  add_foreign_key "players", "campaigns"
  add_foreign_key "players", "characters"
  add_foreign_key "players", "users"
  add_foreign_key "sessions", "campaigns"
  add_foreign_key "sessions", "users"
end
