# A grid battle map: terrain codes per cell plus per-cell settings. Stored as
# data (not an image) so the rules helpers can read it.
class BattleMap < ApplicationRecord
  GRIDS = %w[square hex].freeze
  LIGHTING = %w[bright dim dark].freeze
  # Keep in sync with frontend/src/battlemap/terrain.ts.
  TERRAIN = %w[g . s d h , m ~ W o # D c t P b T f ^ l B].freeze
  MIN_SIZE = 5
  MAX_WIDTH = 60
  MAX_HEIGHT = 40
  MAX_PROPS = 400

  belongs_to :campaign
  belongs_to :user
  belongs_to :session, optional: true

  validates :name, presence: true, length: { maximum: 120 }
  validates :grid, inclusion: { in: GRIDS }
  validates :lighting, inclusion: { in: LIGHTING }
  validates :width, numericality: { only_integer: true, in: MIN_SIZE..MAX_WIDTH }
  validates :height, numericality: { only_integer: true, in: MIN_SIZE..MAX_HEIGHT }
  validate :cells_match_size
  validate :props_shape
  validate :settings_shape

  # A blank map of the given size, all one terrain.
  def self.blank_cells(width, height, fill = 'g')
    Array.new(height) { fill * width }
  end

  private

  def cells_match_size
    unless cells.is_a?(Array) && cells.length == height.to_i && cells.all? { |r| r.is_a?(String) && r.length == width.to_i }
      return errors.add(:cells, "must be #{height} rows of #{width} cells")
    end

    bad = cells.join.chars.uniq - TERRAIN
    errors.add(:cells, "has unknown terrain: #{bad.first(5).join(' ')}") if bad.any?
  end

  def props_shape
    return errors.add(:props, 'must be an object') unless props.is_a?(Hash)
    return errors.add(:props, "can have at most #{MAX_PROPS} entries") if props.size > MAX_PROPS

    props.each do |key, value|
      x, y = key.to_s.split(',').map { |n| Integer(n, exception: false) }
      unless x && y && x.between?(0, width.to_i - 1) && y.between?(0, height.to_i - 1) && value.is_a?(Hash)
        return errors.add(:props, "has an invalid entry: #{key}")
      end
    end
  end

  def settings_shape
    errors.add(:settings, 'must be an object') unless settings.is_a?(Hash)
  end
end
