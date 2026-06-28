import React, { useEffect, useState } from 'react';
import { getCampaigns, getJoinedCampaigns } from '../../../../api/backendHelpers';

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
  const [owned, setOwned] = useState<Campaign[]>([]);
  const [joined, setJoined] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [ownedRes, joinedRes] = await Promise.all([
          getCampaigns(),
          getJoinedCampaigns(),
        ]);
        setOwned(ownedRes.data);
        // filter out duplicates
        const ownedIds = new Set(ownedRes.data.map((c: Campaign) => c.id));
        setJoined(joinedRes.data.filter((c: Campaign) => !ownedIds.has(c.id)));
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
      {owned.length > 0 && (
        <optgroup label="My Campaigns">
          {owned.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </optgroup>
      )}
      {joined.length > 0 && (
        <optgroup label="Joined Campaigns">
          {joined.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
};

export default CampaignSelector;