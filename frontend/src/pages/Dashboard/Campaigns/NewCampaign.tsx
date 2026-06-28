import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign } from '../../../api/backendHelpers';

const NewCampaign = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createCampaign(form);
      navigate('/dashboard/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-theme mb-1">New Campaign</h2>
      <p className="text-muted-theme mb-4">Create a new campaign.</p>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
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
              value={form.description}
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

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-theme-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/dashboard/campaigns')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCampaign;