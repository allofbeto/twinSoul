import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateUser, deactivateUser, closeUser, deleteUser } from '../../../api/backendHelpers';
import { useNavigate } from 'react-router-dom';

const MyAccount = () => {
  const { user, logout, setTheme } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
  });

  const handleThemeChange = async (theme: string) => {
    try {
      await updateUser({ theme });
      setTheme(theme);
      setSuccess('Theme updated!');
    } catch {
      setError('Could not update theme.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateUser(form);
      setSuccess('Account updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.errors?.join(', ') || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate your account?')) return;
    try {
      await deactivateUser();
      logout();
      navigate('/login');
    } catch (err: any) {
      setError('Could not deactivate account.');
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Close your account? This cannot be undone.')) return;
    try {
      await closeUser();
      logout();
      navigate('/login');
    } catch (err: any) {
      setError('Could not close account.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete your account? This cannot be undone.')) return;
    try {
      await deleteUser();
      logout();
      navigate('/login');
    } catch (err: any) {
      setError('Could not delete account.');
    }
  };

  return (
    <div>
      <h2 className="text-theme mb-1">My Account</h2>
      <p className="text-muted-theme mb-4">Manage your profile and account settings.</p>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card-theme p-4 mb-4">
        <h5 className="text-theme mb-3">Profile</h5>
        <form onSubmit={handleUpdate}>
          <div className="row mb-3">
            <div className="col">
              <label className="form-label text-muted-theme">First name</label>
              <input
                type="text"
                name="first_name"
                className="form-control input-theme"
                value={form.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="col">
              <label className="form-label text-muted-theme">Last name</label>
              <input
                type="text"
                name="last_name"
                className="form-control input-theme"
                value={form.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted-theme">Email</label>
            <input
              type="email"
              name="email"
              className="form-control input-theme"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-muted-theme">Phone</label>
            <input
              type="tel"
              name="phone"
              className="form-control input-theme"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="mb-4">
            <label className="form-label text-muted-theme">New password <span className="text-muted-theme">(leave blank to keep current)</span></label>
            <input
              type="password"
              name="password"
              className="form-control input-theme"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn btn-theme-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="card-theme p-4 mb-4">
        <h5 className="text-theme mb-3">Theme</h5>
        <div className="d-flex gap-3">
          <div
            onClick={() => handleThemeChange('default')}
            style={{
              cursor: 'pointer',
              border: user?.theme === 'default' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
              borderRadius: '8px',
              padding: '1rem 1.5rem',
              background: '#0f0f1a',
              color: '#f8f8f2',
              textAlign: 'center',
              minWidth: '120px',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌙</div>
            <small>Default</small>
          </div>

          <div
            onClick={() => handleThemeChange('magic')}
            style={{
              cursor: 'pointer',
              border: user?.theme === 'magic' ? '2px solid #d4af37' : '2px solid #3d2f1f',
              borderRadius: '2px',
              padding: '1rem 1.5rem',
              background: '#0a0e1a',
              color: '#e8dcc4',
              textAlign: 'center',
              minWidth: '120px',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✨</div>
            <small>Magic</small>
          </div>
        </div>
      </div>

      <div className="card-theme p-4">
        <h5 className="text-theme mb-3">Account Status</h5>
        <div className="d-flex flex-column gap-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="text-theme mb-0">Deactivate account</p>
              <small className="text-muted-theme">Temporarily disable your account.</small>
            </div>
            <button className="btn btn-warning" onClick={handleDeactivate}>
              Deactivate
            </button>
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="text-theme mb-0">Close account</p>
              <small className="text-muted-theme">Permanently close your account.</small>
            </div>
            <button className="btn btn-danger" onClick={handleClose}>
              Close
            </button>
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="text-theme mb-0">Delete account</p>
              <small className="text-muted-theme">Permanently delete all your data.</small>
            </div>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;