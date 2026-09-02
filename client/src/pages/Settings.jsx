import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { Settings as SettingsIcon, User, Shield, Key, Bell, Save, CheckCircle2 } from 'lucide-react';

const Settings = () => {
  const { currentUser } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const [name, setName] = useState(currentUser?.name || 'Alex Smith');
  const [email] = useState(currentUser?.email || 'alex@nexushub.io');
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || 'Acme Corp Workspace');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-400" />
          <span>Workspace & Account Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage profile details, security preferences, and workspace configuration</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Profile Settings Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-brand-400" />
            <span>Profile Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Workspace Configuration Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Workspace Preferences</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Workspace Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Security & API Keys */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-amber-400" />
            <span>API Security Tokens</span>
          </h2>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">JWT Access Secret</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Used to sign Bearer authentication tokens for API endpoints</p>
            </div>
            <span className="text-[10px] px-3 py-1 bg-slate-800 text-slate-300 rounded-lg font-mono">
              ••••••••••••••••
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
