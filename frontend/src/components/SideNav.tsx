import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
    label: "Theatre",
    path: "/dashboard/theatre",
    icon: "theatre",
  },
  {
    label: "Characters",
    path: "/dashboard/characters",
    icon: "characters",
  },
  {
    label: "NPCs",
    path: "/dashboard/npcs",
    icon: "npcs",
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
    label: "Monsters",
    path: "/dashboard/monsters",
    icon: "monster",
  },
  {
    label: "Encounters",
    path: "/dashboard/encounters",
    icon: "encounters",
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

  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Section shown in the phone top bar: the longest nav path that matches.
  const currentSection =
    [...navItems]
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) =>
        item.path === "/dashboard"
          ? location.pathname === "/dashboard" || location.pathname === "/dashboard/"
          : location.pathname.startsWith(item.path)
      )?.label ||
    (location.pathname.startsWith("/dashboard/my_account") ? "My Account" : "twinSoul");

  // Close the phone menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // While the phone menu is open: Esc closes it and the page behind can't scroll.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("sidenav-mobile-locked");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("sidenav-mobile-locked");
    };
  }, [mobileOpen]);

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

      {/* Phones: top bar + slide-out menu */}
      <header className="sidenav-mobile-bar">
        <span className="sidenav-mobile-mark" aria-hidden="true">tS</span>
        <span className="sidenav-mobile-title">{currentSection}</span>
        <button
          type="button"
          className="sidenav-mobile-toggle"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="sidenav-mobile-drawer"
        >
          <i className={`bx ${mobileOpen ? "bx-x" : "bx-menu"}`} />
        </button>
      </header>

      <div
        className={`sidenav-mobile-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="sidenav-mobile-drawer"
        className={`sidenav-mobile-drawer ${mobileOpen ? "is-open" : ""}`}
        aria-label="Main menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        {navContent}
      </aside>
    </>
  );
};

export default SideNav;