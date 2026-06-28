import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCampaigns, deleteCampaign } from '../../../api/backendHelpers';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaigns();
        setCampaigns(res.data);
      } catch {
        setError('Could not load campaigns.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Could not delete campaign.');
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-theme mb-1">Campaigns</h2>
          <p className="text-muted-theme mb-0">Your adventures await.</p>
        </div>
        <button
          className="btn btn-theme-primary"
          onClick={() => navigate('/dashboard/campaigns/new')}
        >
          + New Campaign
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {campaigns.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="row g-3">
          {campaigns.map((campaign) => (
            <div className="col-md-6 col-lg-4" key={campaign.id}>
              <div className="card-theme p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="text-theme mb-0">{campaign.name}</h5>
                    <span className={`badge-cls ${campaign.status === 'active' ? '' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-muted-theme mb-0" style={{ fontSize: '0.875rem' }}>
                    {campaign.description || 'No description.'}
                  </p>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button
                    className="btn btn-theme-primary btn-sm"
                    onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(campaign.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;