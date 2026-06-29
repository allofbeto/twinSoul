import React from 'react';
import RichTextEditor from '../../../../components/formComponents/RichTextEditor';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface Player {
  id: string;
  active: boolean;
}

interface Props {
  form: Campaign;
  players: Player[];
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const CampaignOverview = ({ form, players, handleChange }: Props) => {
  const activePlayers = players.filter((p) => p.active).length;

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card-theme p-4 text-center">
          <h2 className="text-theme mb-0">{activePlayers}</h2>
          <small className="text-muted-theme">Active Players</small>
        </div>
        <div className="card-theme p-4 text-center">
          <h2 className="text-theme mb-0">{players.length}</h2>
          <small className="text-muted-theme">Total Players</small>
        </div>
        <div className="card-theme p-4 text-center">
          <span className={`badge-cls`} style={{
            fontSize: '0.9rem',
            background: form.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)'
          }}>
            {form.status}
          </span>
          <br />
          <small className="text-muted-theme mt-1 d-block">Status</small>
        </div>
      </div>

      {/* Campaign info */}
      <div className="card-theme p-4 mb-4">
        <h5 className="text-theme mb-3">Campaign Info</h5>
        <div className="mb-3">
          <label className="form-label text-muted-theme">Name</label>
          <input
            type="text"
            name="name"
            className="form-control input-theme"
            value={form.name}
            onChange={handleChange}
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

      {/* Description */}
      <div className="card-theme p-4">
        <h5 className="text-theme mb-3">Description</h5>
        <RichTextEditor
          content={form.description || ''}
          onChange={(html) => {
            handleChange({
              target: { name: 'description', value: html }
            } as React.ChangeEvent<HTMLTextAreaElement>);
          }}
        />
      </div>
    </div>
  );
};

export default CampaignOverview;