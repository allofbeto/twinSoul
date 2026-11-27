require "test_helper"

# Plain Minitest: no database, so the repo's stale fixtures aren't loaded.
class SessionCombatTest < Minitest::Test
  extend ActiveSupport::Testing::Declarative

  def combat_errors(combat)
    session = Session.new(title: "S", combat: combat)
    session.valid?
    session.errors[:combat]
  end

  test "no combat is fine, and so is a normal fight" do
    assert_empty combat_errors(nil)
    assert_empty combat_errors({ "turn" => 0, "round" => 1, "combatants" => [{ "id" => "a", "name" => "Goblin" }] })
    assert_empty combat_errors({ "turn" => 0, "round" => 1, "combatants" => [] })
  end

  test "rejects something that is not a fight" do
    refute_empty combat_errors("hello")
    refute_empty combat_errors({ "turn" => 1 })
    refute_empty combat_errors({ "combatants" => "x" })
  end

  test "caps the number of combatants" do
    many = Array.new(Session::MAX_COMBATANTS + 1) { |i| { "id" => "c#{i}", "name" => "Rat" } }
    assert_match(/at most/, combat_errors({ "combatants" => many }).first)
    assert_empty combat_errors({ "combatants" => many.first(Session::MAX_COMBATANTS) })
  end
end
