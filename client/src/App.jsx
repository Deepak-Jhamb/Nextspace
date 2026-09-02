import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { CallProvider } from './context/CallContext';

// Protected Route Guard
import ProtectedRoute from './components/ProtectedRoute';

// Layout & Call UI
import AppLayout from './components/Layout/AppLayout';
import CallUI from './components/Call/CallUI';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Files from './pages/Files';
import Chat from './pages/Chat';
import Members from './pages/Members';
import Meetings from './pages/Meetings';
import Billing from './pages/Billing';
import Settings from './pages/Settings';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <CallProvider>
            {/* Global WebRTC Floating Call Overlay */}
            <CallUI />

            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/accept-invite/:token" element={<AcceptInvite />} />

              {/* Protected Workspace Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/files" element={<Files />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/members" element={<Members />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CallProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
