require "test_helper"

# Plain Minitest: no database, so the repo's stale fixtures aren't loaded.
class NpcGeneratorTest < Minitest::Test
  extend ActiveSupport::Testing::Declarative

  RAW = {
    "name" => "Pell Marrow", "disposition" => "friendly", "challenge_rating" => "1/2",
    "armor_class" => 99, "max_hp" => "27",
    "abilities" => { "strength" => 8, "dexterity" => 14, "constitution" => 40, "intelligence" => 12, "wisdom" => 11, "charisma" => 16 },
    "skills" => ["Deception", "Basket Weaving"], "saving_throws" => ["wisdom", "luck"],
    "speed" => "30 ft.", "senses" => "", "languages" => "Common", "defenses" => "", "tags" => ["Tax collector", ""],
    "features" => [
      { "kind" => "trait", "name" => "Nervous Sweat", "desc" => "Always damp." },
      { "kind" => "trait", "name" => "" },
      { "kind" => "banana", "name" => "Not a real kind" },
      {
      "kind" => "action", "name" => "Letter Opener", "desc" => "A stab.", "is_attack" => true, "attack_ability" => "dexterity", "range" => "5 ft.",
      "damages" => [{ "dice_count" => 1, "dice_sides" => 7, "ability" => "dexterity", "bonus" => 0, "type" => "piercing" }],
      "save_ability" => "", "save_dc_ability" => ""
      }
    ],
    "spellcasting_ability" => "charisma", "spell_slots" => [{ "level" => 1, "count" => 2 }, { "level" => 12, "count" => 3 }],
    "spells" => [{ "name" => "Charm Person", "level" => 1, "uses" => "", "concentration" => false, "desc" => "" }],
    "equipment" => [{ "name" => "Ledger", "qty" => 1, "desc" => "" }],
    "appearance" => "Thin <b>and</b> pale.", "personality" => "Anxious.", "voice" => "", "backstory" => "", "secret" => "Cultist.",
    "hooks" => ["Owes the guild money.", ""]
  }.freeze

  def draft(raw = RAW)
    ENV["ANTHROPIC_API_KEY"] = "test-key"
    generator = NpcGenerator.new(concept: "a nervous tax collector", cr: nil, role: nil)
    generator.define_singleton_method(:request_draft) { raw }
    generator.call
  ensure
    ENV.delete("ANTHROPIC_API_KEY")
  end

  test "clamps numbers and drops unknown skills, saves and blank entries" do
    npc = draft
    assert_equal 30, npc["armor_class"]
    assert_equal 27, npc["max_hp"]
    assert_equal 27, npc["current_hp"]
    assert_equal 30, npc["constitution"]
    assert_equal ["Deception"], npc["skills"]
    assert_equal ["wisdom"], npc["saving_throws"]
    assert_equal ["Tax collector"], npc["categories"]
    assert_equal ["Nervous Sweat"], npc["traits"].map { |t| t["name"] }
    assert_equal({ "ability" => "charisma", "slots" => { "1" => 2 } }, npc["spellcasting"])
  end

  test "turns an attack into the fields the builder computes from" do
    action = draft["actions"].first
    assert_equal "attack", action["roll_kind"]
    assert_equal "dexterity", action["attack_ability"]
    assert_equal true, action["attack_proficient"]
    damage = action["damages"].first
    assert_equal 6, damage["dice_sides"], "an invalid die falls back to a d6"
    assert_equal "piercing", damage["type"]
  end

  test "escapes the notes and keeps only what was written" do
    notes = draft["notes"]
    assert_includes notes, "<h3>Appearance</h3>"
    assert_includes notes, "Thin &lt;b&gt;and&lt;/b&gt; pale."
    refute_includes notes, "<b>"
    refute_includes notes, "Voice and mannerisms"
    assert_includes notes, "<li>Owes the guild money.</li>"
  end

  test "needs a concept, a short one, and a configured key" do
    ENV.delete("ANTHROPIC_API_KEY")
    assert_raises(NpcGenerator::Error) { NpcGenerator.call(concept: " ") }
    assert_raises(NpcGenerator::Error) { NpcGenerator.call(concept: "x" * 601) }
    assert_raises(NpcGenerator::NotConfigured) { NpcGenerator.call(concept: "a guard") }
  end
end
