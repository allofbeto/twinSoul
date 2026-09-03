import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCampaigns, createCampaignItem } from '../../../api/backendHelpers';
import { ABILITY_SCORES } from '../Characters/constants';

interface Campaign {
  id: string;
  name: string;
}

const DISPOSITIONS = ['hostile', 'neutral', 'friendly'];

const NewNpc = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    campaign_id: '',
    name: '',
    disposition: 'neutral',
    challenge_rating: '',
    categories: '',
    image_url: '',
    armor_class: 10,
    max_hp: 10,
    current_hp: 10,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        // NPCs are created via the campaign-scoped, owner-only endpoint, so
        // only campaigns this user owns (not merely joined) are valid targets.
        const res = await getCampaigns();
        setCampaigns(res.data);
        if (res.data.length > 0) {
          setForm((f) => ({ ...f, campaign_id: res.data[0].id }));
        }
      } catch {
        setError('Could not load campaigns.');
      }
    };
    fetch();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: parseInt(e.target.value) || 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.campaign_id) {
      setError('You need a campaign to create an NPC in.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { campaign_id, categories, ...rest } = form;
      const res = await createCampaignItem(campaign_id, {
        ...rest,
        kind: 'npc',
        categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
      });
      navigate(`/dashboard/npcs/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-theme mb-1">New NPC</h2>
      <p className="text-muted-theme mb-4">Add a non-player character to one of your campaigns.</p>

      {error && <div className="alert alert-danger">{error}</div>}

      {campaigns.length === 0 ? (
        <div className="card-theme p-4 text-center">
          <p className="text-muted-theme mb-0">
            You need to own a campaign before you can create an NPC. Create one first.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card-theme p-4 mb-4">
            <h5 className="text-theme mb-3">Basic Info</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label text-muted-theme">Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control input-theme"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted-theme">Campaign</label>
                <select
                  name="campaign_id"
                  className="form-select input-theme"
                  value={form.campaign_id}
                  onChange={handleChange}
                  required
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted-theme">Disposition</label>
                <select
                  name="disposition"
                  className="form-select input-theme"
                  value={form.disposition}
                  onChange={handleChange}
                >
                  {DISPOSITIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted-theme">Challenge Rating</label>
                <input
                  type="text"
                  name="challenge_rating"
                  className="form-control input-theme"
                  placeholder="e.g. 1/4, 5"
                  value={form.challenge_rating}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label text-muted-theme">Tags</label>
                <input
                  type="text"
                  name="categories"
                  className="form-control input-theme"
                  placeholder="Tavern keeper, Recurring"
                  value={form.categories}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted-theme">Image URL</label>
                <input
                  type="text"
                  name="image_url"
                  className="form-control input-theme"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label text-muted-theme">Max HP</label>
                <input
                  type="number"
                  name="max_hp"
                  className="form-control input-theme"
                  min={0}
                  value={form.max_hp}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label text-muted-theme">Current HP</label>
                <input
                  type="number"
                  name="current_hp"
                  className="form-control input-theme"
                  min={0}
                  value={form.current_hp}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label text-muted-theme">Armor Class</label>
                <input
                  type="number"
                  name="armor_class"
                  className="form-control input-theme"
                  min={0}
                  value={form.armor_class}
                  onChange={handleNumberChange}
                />
              </div>
            </div>
          </div>

          <div className="card-theme p-4 mb-4">
            <h5 className="text-theme mb-3">Ability Scores</h5>
            <div className="row g-3">
              {ABILITY_SCORES.map(({ key, label }) => (
                <div className="col-4 col-md-2" key={key}>
                  <label className="form-label text-muted-theme text-center d-block">{label}</label>
                  <input
                    type="number"
                    name={key}
                    className="form-control input-theme text-center"
                    min={1}
                    max={30}
                    value={(form as any)[key]}
                    onChange={handleNumberChange}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-theme-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create NPC'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate('/dashboard/npcs')}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewNpc;
