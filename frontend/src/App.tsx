import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Registration';
import DashboardLayout from './pages/Dashboard/DashboardLayout';
import Campaigns from './pages/Dashboard/Campaigns/Campaigns';
import NewCampaign from './pages/Dashboard/Campaigns/NewCampaign';
import CampaignDetail from './pages/Dashboard/Campaigns/CampaignDetail';
import Characters from './pages/Dashboard/Characters/Characters';
import CharacterDetail from './pages/Dashboard/Characters/CharacterDetail';
import NewCharacter from './pages/Dashboard/Characters/NewCharacter';
import Home from './pages/Dashboard/Home/Home';
import MyAccount from './pages/Dashboard/MyAccount/MyAccount';
import PlayerProfile from './pages/Players/PlayerProfile';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="characters" element={<Characters />} />
            <Route path="characters/new" element={<NewCharacter />} />
            <Route path="characters/:id" element={<CharacterDetail />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/new" element={<NewCampaign />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="campaigns/:id/players/:playerId" element={<PlayerProfile />} />
            <Route path="my_account" element={<MyAccount />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;