import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerUser } from '../../api/backendHelpers';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }
  
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
  
    try {
      const res = await registerUser(form);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      setError(Array.isArray(errors) ? errors.join(', ') : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg d-flex align-items-center justify-content-center">
      <div className="card-theme p-4" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 className="text-theme mb-1">Create an account</h2>
        <p className="text-muted-theme mb-4">Start your adventure</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row mb-3">
            <div className="col">
              <label className="form-label text-muted-theme">First name</label>
              <input
                type="text"
                name="first_name"
                className="form-control input-theme"
                placeholder="Jane"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col">
              <label className="form-label text-muted-theme">Last name</label>
              <input
                type="text"
                name="last_name"
                className="form-control input-theme"
                placeholder="Doe"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted-theme">Email</label>
            <input
              type="email"
              name="email"
              className="form-control input-theme"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-muted-theme">Phone</label>
            <input
              type="tel"
              name="phone"
              className="form-control input-theme"
              placeholder="555-1234"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="mb-4">
            <label className="form-label text-muted-theme">Password</label>
            <input
              type="password"
              name="password"
              className="form-control input-theme"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-theme-primary w-100"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-muted-theme text-center mt-3 mb-0">
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;