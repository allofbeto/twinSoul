import React from 'react';
import RichTextEditor from '../../../../components/formComponents/RichTextEditor';
import { CAMPAIGN_SWATCHES, campaignColor, isHexColor } from '../../../../utils/campaignColor';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string | null;
}

interface Player {
  id: string;
  active: boolean;
}

interface Props {
  form: Campaign;
  players: Player[];
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onColorChange: (color: string) => void;
}

const CampaignOverview = ({ form, players, handleChange, onColorChange }: Props) => {
  const accent = campaignColor(form.id, form.color);
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
        <div className="mb-1">
          <label className="form-label text-muted-theme">Color</label>
          <div className="camp-color">
            <span className="camp-color-preview" style={{ background: accent }} title="Current color" />
            <div className="camp-swatches" role="group" aria-label="Campaign color">
              {CAMPAIGN_SWATCHES.map((c) => (
                <button key={c} type="button" className={`camp-swatch ${form.color?.toLowerCase() === c ? 'is-on' : ''}`} style={{ background: c }}
                  aria-label={`Use ${c}`} aria-pressed={form.color?.toLowerCase() === c} onClick={() => onColorChange(c)} />
              ))}
              <label className="camp-swatch camp-swatch--custom" title="Pick any color">
                <input type="color" value={isHexColor(form.color) ? form.color : '#c9a94a'} onChange={(e) => onColorChange(e.target.value)} aria-label="Custom color" />
                +
              </label>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!form.color} onClick={() => onColorChange('')}>Auto</button>
          </div>
          <small className="text-muted-theme">Shows up on this campaign’s sessions, cards and header. “Auto” picks one for you.</small>
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