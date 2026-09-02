import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 p-8 glass-panel rounded-2xl max-w-sm w-full text-center">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-white">Verifying Session...</h3>
            <p className="text-xs text-slate-400 mt-1">Connecting to NexusHub secure gateway</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
