require "test_helper"

# Plain Minitest: no database, so the repo's stale fixtures aren't loaded.
class BattleMapTest < Minitest::Test
  extend ActiveSupport::Testing::Declarative

  def errors_for(**attrs)
    map = BattleMap.new({ name: "Mill", grid: "square", width: 5, height: 5, lighting: "bright",
                          cells: BattleMap.blank_cells(5, 5), props: {}, settings: {} }.merge(attrs))
    map.valid?
    map.errors
  end

  test "a blank map is valid apart from its owners" do
    errors = errors_for
    %i[name grid width height cells props settings lighting].each { |f| assert_empty errors[f], f.to_s }
  end

  test "cells must match the size and use known terrain" do
    refute_empty errors_for(cells: BattleMap.blank_cells(5, 4))[:cells]
    refute_empty errors_for(cells: ["ggggg"] * 4 + ["gggg"])[:cells]
    refute_empty errors_for(cells: ["ggggZ"] + ["ggggg"] * 4)[:cells]
    assert_empty errors_for(cells: ["#.,~W"] + ["ggggg"] * 4)[:cells]
  end

  test "size, grid and lighting are bounded" do
    refute_empty errors_for(width: 4, cells: BattleMap.blank_cells(4, 5))[:width]
    refute_empty errors_for(width: 61, cells: BattleMap.blank_cells(61, 5))[:width]
    refute_empty errors_for(grid: "triangle")[:grid]
    refute_empty errors_for(lighting: "noon")[:lighting]
  end

  test "props are keyed by cells on the map" do
    assert_empty errors_for(props: { "2,3" => { "state" => "open" } })[:props]
    refute_empty errors_for(props: { "9,9" => { "state" => "open" } })[:props]
    refute_empty errors_for(props: { "a,b" => {} })[:props]
    refute_empty errors_for(props: { "1,1" => "open" })[:props]
  end
end
