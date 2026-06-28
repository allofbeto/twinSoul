import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaign, updateCampaign } from '../../../api/backendHelpers';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
}

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<Campaign | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCampaign(id!);
        setForm(res.data);
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
        </div>

        <div className="card-theme p-4 mb-4">
          <div className="mb-3">
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
          <div className="mb-3">
            <label className="form-label text-muted-theme">Description</label>
            <textarea
              name="description"
              className="form-control input-theme"
              value={form.description || ''}
              onChange={handleChange}
              rows={4}
            />
          </div>
          <div className="mb-3">
            <label className="form-label text-muted-theme">Status</label>
            <select
              name="status"
              className="form-select input-theme"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CampaignDetail;