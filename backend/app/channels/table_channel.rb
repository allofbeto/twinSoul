class TableChannel < ApplicationCable::Channel
    # Last-known stage per campaign, kept in process memory so a player who
    # joins (or reloads) after the DM has already revealed something gets
    # caught up instead of seeing a dark stage. Resets on server restart —
    # that's fine, it's "what's on stage right now", not durable data.
    STAGES = Concurrent::Hash.new

    # Last-known initiative order, already redacted (see #redacted below) —
    # this is the only copy ever cached or broadcast to the shared stream, so
    # a player's connection never receives an unrevealed creature's real name.
    INITIATIVE = Concurrent::Hash.new

    def subscribed
      campaign = Campaign.find(params[:campaign_id])
      reject unless member?(campaign)

      stream_for campaign
      stream_from initiative_stream_name(campaign)

      transmit({ type: 'reveal', assets: STAGES[campaign.id] || [] })
      state = INITIATIVE[campaign.id] || { 'combatants' => [], 'turn' => 0, 'round' => 1 }
      transmit({ type: 'initiative', combatants: state['combatants'], turn: state['turn'], round: state['round'] || 1 })
    end

    def unsubscribed; end

    # DM drives the stage; broadcast to everyone at the table.
    # assets is the full current list of staged cards (owner sends the whole
    # list on every add/remove/clear; an empty array clears the stage).
    def reveal(data)
      campaign = Campaign.find(params[:campaign_id])
      return unless owner?(campaign)

      assets = data['assets'] || []
      STAGES[campaign.id] = assets
      TableChannel.broadcast_to(campaign, { type: 'reveal', assets: assets })
    rescue ActiveRecord::RecordNotFound
      nil
    end

    # The DM's own tracker (full detail) never leaves their browser — this
    # channel only ever sees and forwards a redacted copy: any enemy
    # combatant not yet marked `revealed` has its name stripped before it's
    # cached or broadcast, so players see turn order without seeing who's
    # actually in it until the DM says so.
    def set_initiative(data)
      campaign = Campaign.find(params[:campaign_id])
      return unless owner?(campaign)

      combatants = redacted(data['combatants'] || [])
      turn = data['turn'] || 0
      round = [data['round'].to_i, 1].max
      INITIATIVE[campaign.id] = { 'combatants' => combatants, 'turn' => turn, 'round' => round }
      ActionCable.server.broadcast(
        initiative_stream_name(campaign),
        { type: 'initiative', combatants: combatants, turn: turn, round: round }
      )
    rescue ActiveRecord::RecordNotFound
      nil
    end

    # A player asking to add one of their own characters to the tracker.
    # Looked up server-side by id — scoped to this user and this campaign —
    # so the broadcast carries the character's real, current stats rather
    # than whatever a client claims; nothing about a PC is secret at the
    # table anyway, so this just goes out on the shared stream and only the
    # DM's client actually inserts it into the tracker.
    def add_character(data)
      campaign = Campaign.find(params[:campaign_id])
      return unless member?(campaign)

      # Characters with homebrew the DM hasn't approved can't join the table yet.
      character = Character.playable.find_by(id: data['character_id'], user_id: current_user.id, campaign_id: campaign.id)
      return unless character

      TableChannel.broadcast_to(campaign, {
        type: 'add_character',
        character: {
          characterId: character.id,
          name: character.name,
          hp: character.current_hp,
          maxHp: character.max_hp,
          armorClass: character.armor_class,
          initiative: initiative_from(data['initiative']),
        }
      })
    rescue ActiveRecord::RecordNotFound
      nil
    end

    # A player telling the DM they're finished. Only honoured when it really
    # is their character's turn (the server knows the order from the DM's last
    # update), so nobody can nudge the DM on someone else's behalf.
    def end_turn(_data = nil)
      campaign = Campaign.find(params[:campaign_id])
      return unless member?(campaign)

      state = INITIATIVE[campaign.id]
      return unless state

      current = Array(state['combatants'])[state['turn'].to_i]
      character_id = current && current['characterId']
      return if character_id.blank?
      return unless Character.exists?(id: character_id, user_id: current_user.id, campaign_id: campaign.id)

      TableChannel.broadcast_to(campaign, { type: 'turn_done', characterId: character_id, name: current['name'] })
    rescue ActiveRecord::RecordNotFound
      nil
    end

    private

    # A player's own roll, kept to something a d20 plus modifiers could make.
    def initiative_from(value)
      n = Integer(value, exception: false)
      n if n && n.between?(-10, 60)
    end

    def initiative_stream_name(campaign)
      "table_initiative_#{campaign.id}"
    end

    # What players may know about a combatant: where it sits in the order and
    # whether it's a creature or a player's character. Nothing else is ever
    # forwarded (no HP, AC, actions or resource state), so the DM's own
    # tracker can carry whatever it needs without it reaching a player's
    # connection. Anything the DM added (that isn't a player's character) is
    # shown as "Unknown Creature" until the DM reveals it.
    PLAYER_VISIBLE = %w[id name init isEnemy revealed characterId].freeze
    # A player's character is nothing secret at the table, so its HP is shared too.
    CHARACTER_VISIBLE = %w[hp maxHp].freeze

    def redacted(combatants)
      Array(combatants).filter_map do |c|
        next unless c.is_a?(Hash)

        visible = c.slice(*PLAYER_VISIBLE)
        next visible.merge(c.slice(*CHARACTER_VISIBLE)) if visible['characterId'].present?
        next visible if visible['revealed']

        visible.merge('name' => 'Unknown Creature')
      end
    end

    def owner?(campaign)
      campaign.user_id == current_user.id
    end

    def member?(campaign)
      owner?(campaign) || campaign.players.exists?(user_id: current_user.id, active: true)
    end
  end
