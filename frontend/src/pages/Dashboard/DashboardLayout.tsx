import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';

import MagicParticles from '../../components/MagicParticles';
import DosParticles from '../../components/DosParticles';

const DashboardLayout = () => {
  return (
    <div className="page-bg d-flex">
      <MagicParticles />
      <DosParticles />
      <SideNav />
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;