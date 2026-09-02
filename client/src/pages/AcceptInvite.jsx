import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { Layers, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useWorkspace();
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState({ loading: true, success: false, message: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login preserving destination
      return;
    }

    const processInvite = async () => {
      const result = await acceptInvite(token);
      if (result.success) {
        setStatus({ loading: false, success: true, message: result.message });
        setTimeout(() => {
          navigate('/members');
        }, 2000);
      } else {
        setStatus({ loading: false, success: false, message: result.message });
      }
    };

    processInvite();
  }, [token, isAuthenticated, acceptInvite, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Workspace Invitation</h2>
          <p className="text-xs text-slate-400">Please sign in or create an account to accept this invitation.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
          >
            Sign In to Accept
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-slate-800 shadow-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-xl shadow-brand-500/25">
          <Layers className="w-7 h-7" />
        </div>

        {status.loading ? (
          <div className="py-6 space-y-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
            <h3 className="text-base font-semibold text-white">Joining Workspace...</h3>
            <p className="text-xs text-slate-400">Validating invitation token and updating permissions</p>
          </div>
        ) : status.success ? (
          <div className="py-4 space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Welcome to the Workspace!</h3>
            <p className="text-xs text-emerald-300">{status.message}</p>
            <p className="text-[11px] text-slate-400">Redirecting to workspace members directory...</p>
          </div>
        ) : (
          <div className="py-4 space-y-3 animate-in fade-in">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Invitation Invalid</h3>
            <p className="text-xs text-red-300">{status.message}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
