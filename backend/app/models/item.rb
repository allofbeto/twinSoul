class Item < ApplicationRecord
    KINDS = %w[item npc map encounter art].freeze
    DISPOSITIONS = %w[hostile neutral friendly].freeze

    belongs_to :user
    validates :name, presence: true
    validates :kind, inclusion: { in: KINDS }
    validates :disposition, inclusion: { in: DISPOSITIONS }
    belongs_to :inventory, optional: true
    belongs_to :campaign, optional: true
    has_many :inventory_items, dependent: :destroy
end