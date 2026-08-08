import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/sideNav.css";
import CustomIcon, { icons } from "./CustomIcons";

type IconName = keyof typeof icons;

type NavItem = {
  label: string;
  path: string;
  icon: IconName;
};

const navItems: NavItem[] = [
  {
    label: "Home",
    path: "/dashboard",
    icon: "home",
  },
  {
    label: "Characters",
    path: "/dashboard/characters",
    icon: "characters",
  },
  {
    label: "Campaigns",
    path: "/dashboard/campaigns",
    icon: "campaigns",
  },
  {
    label: "Items",
    path: "/dashboard/items",
    icon: "items",
  },
  {
    label: "Sessions",
    path: "/dashboard/sessions",
    icon: "sessions",
  },
];

const SideNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("sidenav-pinned", pinned);

    return () => {
      document.body.classList.remove("sidenav-pinned");
    };
  }, [pinned]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMyAccount = () => {
    setMobileOpen(false);
    navigate("/dashboard/my_account");
  };

  const navContent = (
    <div className="sidenav-content d-flex flex-column h-100">
      <div className="sidenav-header">
        <div className="sidenav-logo">
          <span className="sidenav-logo-mark">tS</span>
          <span className="nav-label">twinSoul</span>
        </div>

        {user && (
          <div className="sidenav-user nav-label">
            {user.first_name} {user.last_name}
          </div>
        )}
      </div>

      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) =>
              `nav-link-theme ${isActive ? "active" : ""}`
            }
            onClick={() => setMobileOpen(false)}
            data-tooltip={item.label}
          >
            {({ isActive }) => (
              <>
                <CustomIcon
                  name={item.icon}
                  width={22}
                  height={22}
                />

                <span className="nav-label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidenav-bottom-actions">
        <NavLink
          to="/dashboard/my_account"
          className={({ isActive }) =>
            `nav-link-theme nav-link-bottom ${
              isActive ? "active" : ""
            }`
          }
          onClick={handleMyAccount}
          data-tooltip="My Account"
        >
          <i className="bx bx-user-circle" />
          <span className="nav-label">My Account</span>
        </NavLink>

        <button
          type="button"
          className="nav-link-theme nav-link-bottom nav-link-logout w-100"
          onClick={handleLogout}
          data-tooltip="Logout"
        >
          <i className="bx bx-log-out" />
          <span className="nav-label">Logout</span>
        </button>

        <button
          type="button"
          className="nav-link-theme nav-link-bottom nav-link-toggle w-100"
          onClick={() => setPinned((current) => !current)}
          data-tooltip={pinned ? "Collapse" : "Keep open"}
          aria-label={pinned ? "Collapse sidebar" : "Keep sidebar open"}
        >
          <i
            className={`bx ${
              pinned ? "bx-chevrons-left" : "bx-chevrons-right"
            }`}
          />

          <span className="nav-label">
            {pinned ? "Collapse" : "Keep open"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div
        className={`sidenav-desktop surface ${
          pinned ? "sidenav-open" : "sidenav-collapsed"
        }`}
      >
        {navContent}
      </div>

      {/* Mobile */}
      <button
        type="button"
        className="sidenav-mobile-toggle"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label={
          mobileOpen ? "Close navigation" : "Open navigation"
        }
      >
        <i className={`bx ${mobileOpen ? "bx-x" : "bx-menu"}`} />
      </button>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="sidenav-mobile-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />

          <div className="sidenav-mobile-drawer surface">
            {navContent}
          </div>
        </>
      )}
    </>
  );
};

export default SideNav;