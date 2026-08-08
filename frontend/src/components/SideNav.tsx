import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sideNav.css';

const navItems = [
  { label: 'Home', path: '/dashboard', icon: 'bx-home-alt' },
  { label: 'Characters', path: '/dashboard/characters', icon: 'bx-user' },
  { label: 'Campaigns', path: '/dashboard/campaigns', icon: 'bx-book-content' },
  { label: 'Items', path: '/dashboard/items', icon: 'bx-package' },
  { label: 'Sessions', path: '/dashboard/sessions', icon: 'bx-calendar-event' },
];

const SideNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('sidenav-pinned', pinned);
    return () => document.body.classList.remove('sidenav-pinned');
  }, [pinned]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const myAccount = () => {
    navigate('/my_account');
  };

  const navContent = (
    <div className="sidenav-inner d-flex flex-column h-100">
      <div className="sidenav-header mb-4">
        <div className="sidenav-brand">
          <span className="brand-mark text-theme">tS</span>
          <span className="brand-full">
            <h5 className="text-theme mb-0">twinSoul</h5>
            <small className="text-muted-theme">{user?.first_name} {user?.last_name}</small>
          </span>
        </div>
        <button
          type="button"
          className="sidenav-toggle"
          onClick={() => setPinned((p) => !p)}
          data-tooltip={pinned ? 'Collapse' : 'Keep open'}
          aria-label={pinned ? 'Collapse sidebar' : 'Keep sidebar open'}
        >
          <i className={`bx ${pinned ? 'bx-chevrons-left' : 'bx-chevrons-right'}`} />
        </button>
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
            data-tooltip={item.label}
          >
            <i className={`bx ${item.icon}`} />
            <span className="nav-label">{item.label}</span>
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
          data-tooltip="My Account"
        >
          <i className="bx bx-user-circle" />
          <span className="nav-label">My Account</span>
        </NavLink>
        <button
          className="nav-link-theme nav-link-bottom nav-link-logout w-100"
          onClick={handleLogout}
          data-tooltip="Logout"
        >
          <i className="bx bx-log-out" />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className={`sidenav-desktop surface ${pinned ? 'sidenav-open' : 'sidenav-collapsed'}`}>
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