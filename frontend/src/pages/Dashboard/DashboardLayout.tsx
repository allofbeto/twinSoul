import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';

const DashboardLayout = () => {
  return (
    <div className="page-bg d-flex">
      <SideNav />
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;