import React, { useEffect, useState } from 'react';
import { getCampaigns } from '../../../../api/backendHelpers';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Props {
  campaignId: string | null;
  onChange: (id: string | null) => void;
}

const CampaignSelector = ({ campaignId, onChange }: Props) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaigns();
        setCampaigns(res.data);
      } catch {
        console.error('Could not load campaigns');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return null;

  return (
    <select
        className="form-select input-theme"
        style={{ 
            maxWidth: '160px', 
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            height: 'auto',
        }}
        value={campaignId || ''}
        onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">No campaign</option>
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
};

export default CampaignSelector;