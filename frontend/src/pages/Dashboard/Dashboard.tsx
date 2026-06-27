import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-bg p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-theme mb-0">Welcome, {user?.first_name}!</h2>
        <button className="btn btn-theme-primary" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="card-theme p-4">
        <p className="text-muted-theme mb-0">Your dashboard is ready. More coming soon.</p>
      </div>
    </div>
  );
};

export default Dashboard;