import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sideNav.css';

const navItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Characters', path: '/dashboard/characters' },
  { label: 'Campaigns', path: '/dashboard/campaigns' },
];

const SideNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const myAccount = () => {
    navigate('/my_account');
  };

  const navContent = (
    <div className="d-flex flex-column h-100 p-3">
      <div className="mb-4">
        <h5 className="text-theme mb-0">twinSoul</h5>
        <small className="text-muted-theme">{user?.first_name} {user?.last_name}</small>
      </div>

      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `nav-link-theme ${isActive ? 'active' : ''}`
            }
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidenav-bottom-actions">
        <NavLink
          to="/dashboard/my_account"
          className={({ isActive }) =>
            `nav-link-theme nav-link-bottom ${isActive ? 'active' : ''}`
          }
          onClick={() => myAccount()}
        >
          <i className="bx bx-user-circle" />
          My Account
        </NavLink>
        <button className="nav-link-theme nav-link-bottom nav-link-logout w-100" onClick={handleLogout}>
          <i className="bx bx-log-out" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="sidenav-desktop surface">
        {navContent}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sidenav-mobile-drawer surface">
          {navContent}
        </div>
      )}
    </>
  );
};

export default SideNav;