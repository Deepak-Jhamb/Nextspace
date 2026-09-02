import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Layers, Mail, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ loading: false, success: false, message: '', devUrl: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus({ loading: true, success: false, message: '', devUrl: '' });

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setStatus({
        loading: false,
        success: true,
        message: response.data.message || 'Reset link sent to your email.',
        devUrl: response.data.devResetUrl || '',
      });
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        message: error.response?.data?.message || 'Failed to request password reset.',
        devUrl: '',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-xl shadow-brand-500/25 mb-4">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1.5">Enter your email to receive a password reset link</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-slate-800">
          {status.message && (
            <div
              className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-xs ${
                status.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {status.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{status.success ? 'Email Sent' : 'Error'}</p>
                <p className="mt-0.5">{status.message}</p>
                {status.devUrl && (
                  <div className="mt-3 p-2 bg-slate-900 rounded-lg text-[10px] break-all border border-slate-800 text-brand-300">
                    <strong>Dev Mode Link:</strong>{' '}
                    <a href={status.devUrl} className="underline hover:text-white">
                      {status.devUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.smith@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status.loading}
              className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 mt-6"
            >
              {status.loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
