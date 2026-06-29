import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign, updateCampaign, getPlayers } from '../../../api/backendHelpers';
import CampaignOverview from './Components/Overview';
import CampaignPlayers from './Components/CampaignPlayers';
import CampaignSessions from './Components/CampaignSessions';
import CampaignItems from './Components/CampaignItems';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface Character {
  id: string;
  name: string;
  race: string;
  level: number;
}

interface Player {
  id: string;
  active: boolean;
  character: Character | null;
  user_email: string;
  user_name: string;
  user_id: string;
}

type Tab = 'overview' | 'players' | 'sessions' | 'items';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'players', label: 'Players' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'items', label: 'Items' },
];

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Campaign | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [campaignRes, playersRes] = await Promise.all([
          getCampaign(id!),
          getPlayers(id!),
        ]);
        setForm(campaignRes.data);
        setPlayers(playersRes.data);
      } catch {
        setError('Could not load campaign.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form!, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateCampaign(id!, form!);
      setSuccess('Campaign updated!');
      setIsDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-theme">Loading...</p>;
  if (!form) return <p className="text-muted-theme">Campaign not found.</p>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Sticky Top Bar */}
        <div className="sticky-save-bar">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h2 className="text-theme mb-0">{form.name}</h2>
              <small className="text-muted-theme">{form.status}</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {success && <span className="text-success">{success}</span>}
              {error && <span className="text-danger">{error}</span>}
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/dashboard/campaigns')}
              >
                ← Back
              </button>
              {isDirty && (
                <button type="submit" className="btn btn-theme-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="tabbed-panel-tabs mt-2">
            {TABS.map((tab) => (
              <button
                type="button"
                key={tab.key}
                className={`tabbed-panel-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'overview' && (
            <CampaignOverview
              form={form}
              players={players}
              handleChange={handleChange}
            />
          )}
        </div>
      </form>

      {activeTab === 'players' && (
        <CampaignPlayers
          campaignId={id!}
          players={players}
          setPlayers={setPlayers}
        />
      )}
      {activeTab === 'sessions' && (
        <CampaignSessions campaignId={id!} />
      )}
      {activeTab === 'items' && (
        <CampaignItems campaignId={id!} />
      )}
    </div>
  );
};

export default CampaignDetail;