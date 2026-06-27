import React from 'react';
import { useAuth } from '../../../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-theme mb-1">Welcome, {user?.first_name}!</h2>
      <p className="text-muted-theme mb-4">What will you create today?</p>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card-theme p-4">
            <h5 className="text-theme">Characters</h5>
            <p className="text-muted-theme mb-0">Manage your characters.</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card-theme p-4">
            <h5 className="text-theme">Campaigns</h5>
            <p className="text-muted-theme mb-0">Manage your campaigns.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;