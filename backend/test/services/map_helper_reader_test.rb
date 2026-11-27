require "test_helper"

# Plain Minitest: no database and no API calls.
class MapHelperReaderTest < Minitest::Test
  extend ActiveSupport::Testing::Declarative

  def normalize(data)
    MapHelperReader.new(text: "x", answers: {}, asking: nil).send(:normalize, data)
  end

  test "keeps only known values" do
    out = normalize(
      "biome" => "tavern", "structure" => "rooms", "rooms" => 3, "hazards_add" => %w[pit lava], "hazards_remove" => [],
      "no_hazards" => false, "cover" => "keep", "lighting" => "dark", "size" => "XL", "grid" => "keep", "new_layout" => false,
      "reply" => "Three rooms it is."
    )
    assert_equal({ biome: "tavern", structure: "rooms", rooms: 3, hazards_add: ["pit"], hazards_remove: [], no_hazards: false,
                   lighting: "dark", new_layout: false, reply: "Three rooms it is." }, out)
  end

  test "drops out-of-range rooms and caps the reply" do
    out = normalize("rooms" => 40, "reply" => "a" * 500, "no_hazards" => true)
    assert_nil out[:rooms]
    assert_equal 300, out[:reply].length
    assert out[:no_hazards]
  end

  test "refuses empty or overlong text before calling anything" do
    assert_raises(MapHelperReader::Error) { MapHelperReader.call(text: "  ") }
    assert_raises(MapHelperReader::Error) { MapHelperReader.call(text: "x" * 401) }
  end
end
