class TableChannel < ApplicationCable::Channel
    def subscribed
      campaign = Campaign.find(params[:campaign_id])
      reject unless member?(campaign)
      stream_for campaign
    end
  
    def unsubscribed; end
  
    # DM drives the stage; broadcast to everyone at the table.
    # asset == nil means "clear the stage".
    def reveal(data)
      campaign = Campaign.find(params[:campaign_id])
      return unless owner?(campaign)
  
      TableChannel.broadcast_to(campaign, { type: 'reveal', asset: data['asset'] })
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