class TableChannel < ApplicationCable::Channel
    # Last-known stage per campaign, kept in process memory so a player who
    # joins (or reloads) after the DM has already revealed something gets
    # caught up instead of seeing a dark stage. Resets on server restart —
    # that's fine, it's "what's on stage right now", not durable data.
    STAGES = Concurrent::Hash.new

    def subscribed
      campaign = Campaign.find(params[:campaign_id])
      reject unless member?(campaign)
      stream_for campaign
      transmit({ type: 'reveal', assets: STAGES[campaign.id] || [] })
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

    private

    def owner?(campaign)
      campaign.user_id == current_user.id
    end

    def member?(campaign)
      owner?(campaign) || campaign.players.exists?(user_id: current_user.id, active: true)
    end
  end
