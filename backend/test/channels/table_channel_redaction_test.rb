require "test_helper"

# Plain Minitest: no database, so the repo's stale fixtures aren't loaded.
class TableChannelRedactionTest < Minitest::Test
  extend ActiveSupport::Testing::Declarative

  def redact(list)
    TableChannel.allocate.send(:redacted, list)
  end

  test "players only ever get the whitelisted fields" do
    out = redact([{ "id" => "c1", "name" => "Goblin", "init" => 14, "isEnemy" => true, "revealed" => true, "hp" => 7, "maxHp" => 7,
                   "armorClass" => 15, "monsterId" => "m", "itemId" => "i", "res" => { "used" => { "Bite" => 1 } } }]).first
    assert_equal %w[id init isEnemy name revealed], out.keys.sort
  end

  test "a player's character also shares its HP (and temporary HP), and nothing else" do
    out = redact([{ "id" => "c1", "name" => "Thorin", "init" => 14, "characterId" => "7", "hp" => 31, "maxHp" => 40, "tempHp" => 5,
                    "armorClass" => 18, "res" => { "used" => {} } }]).first
    assert_equal %w[characterId hp id init maxHp name tempHp], out.keys.sort
  end

  test "statuses are shared for characters and revealed creatures, cleaned up" do
    pc = redact([{ "id" => "a", "name" => "Thorin", "characterId" => "7", "hp" => 1, "maxHp" => 2, "conditions" => ["Prone", "", "x" * 99], "exhaustion" => 9 }]).first
    assert_equal ["Prone", "x" * 30], pc["conditions"]
    assert_equal 6, pc["exhaustion"]
    seen = redact([{ "id" => "b", "name" => "Wolf", "isEnemy" => true, "revealed" => true, "conditions" => ["Stunned"], "hp" => 4 }]).first
    assert_equal ["Stunned"], seen["conditions"]
    refute seen.key?("hp")
  end

  test "a hidden creature shares no statuses and no HP" do
    out = redact([{ "id" => "a", "name" => "Goblin", "isEnemy" => true, "revealed" => false, "conditions" => ["Poisoned"], "exhaustion" => 2 }]).first
    refute out.key?("conditions")
    refute out.key?("exhaustion")
  end

  test "a hidden creature never shows its HP" do
    out = redact([{ "id" => "a", "name" => "Goblin", "isEnemy" => true, "revealed" => false, "hp" => 7, "maxHp" => 7 }]).first
    assert_equal "Unknown Creature", out["name"]
    refute out.key?("hp")
  end

  test "a player's character keeps its name" do
    assert_equal "Thorin", redact([{ "id" => "c1", "name" => "Thorin", "characterId" => "7", "isEnemy" => false }]).first["name"]
  end

  test "anything the DM added is hidden until revealed, allies included" do
    out = redact([
      { "id" => "a", "name" => "Goblin 1", "isEnemy" => true, "revealed" => false },
      { "id" => "b", "name" => "Old Marta", "isEnemy" => false },
      { "id" => "c", "name" => "Wolf", "isEnemy" => true, "revealed" => true }
    ])
    assert_equal ["Unknown Creature", "Unknown Creature", "Wolf"], out.map { |c| c["name"] }
  end

  test "a player's initiative has to be a plausible roll" do
    channel = TableChannel.allocate
    assert_equal 17, channel.send(:initiative_from, "17")
    assert_equal(-2, channel.send(:initiative_from, -2))
    assert_nil channel.send(:initiative_from, 9000)
    assert_nil channel.send(:initiative_from, "abc")
    assert_nil channel.send(:initiative_from, nil)
  end

  test "drops junk entries" do
    assert_equal [], redact([nil, "x", 3])
    assert_equal [], redact(nil)
  end
end
