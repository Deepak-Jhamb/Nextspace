import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Shield,
  Sparkles,
  Layers,
  Check,
  CheckCheck,
  FileText,
  UserPlus,
  Zap,
  Info
} from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const {
    currentWorkspace,
    currentRole,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useWorkspace();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'FILE_UPLOAD':
        return <FileText className="w-3.5 h-3.5 text-brand-400" />;
      case 'INVITATION':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ROLE_CHANGE':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search & Active Workspace Header */}
      <div className="flex items-center gap-4 w-full max-w-lg">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-brand-400" />
          <span className="font-semibold text-white truncate max-w-[120px]">{currentWorkspace?.name || 'Workspace'}</span>
          <span className="px-1.5 py-0.2 bg-brand-500/20 text-brand-300 rounded text-[9px] font-extrabold uppercase">
            {currentRole}
          </span>
        </div>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search files, channels, or members..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Plan Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 border border-brand-500/30 rounded-full text-brand-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span className="capitalize">{currentWorkspace?.plan || 'Free'} Plan</span>
        </div>

        {/* Real-Time Notifications Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifDropdownOpen(!notifDropdownOpen);
              setProfileDropdownOpen(false);
            }}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold bg-brand-500 text-white rounded-full ring-2 ring-[#0d1322]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-80 glass-panel rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden border border-slate-800"
              onMouseLeave={() => setNotifDropdownOpen(false)}
            >
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-brand-500/20 text-brand-300 rounded-full font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[10px] text-brand-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No new notifications in this workspace.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => !n.read && markNotificationRead(n._id)}
                      className={`p-3 text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                        n.read ? 'bg-transparent text-slate-400' : 'bg-brand-500/5 text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${!n.read ? 'font-semibold text-white' : 'text-slate-300'}`}>{n.message}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-800" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotifDropdownOpen(false);
            }}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800/80 transition-all"
          >
            <img
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}`}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-lg object-cover ring-2 ring-brand-500/30"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-none">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-400 mt-1 capitalize">{currentRole} in Workspace</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              onMouseLeave={() => setProfileDropdownOpen(false)}
            >
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser?.email}</p>
              </div>

              <div className="p-1">
                <div className="px-3 py-2 text-[11px] text-slate-400 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-brand-400" />
                  <span>Role: <strong className="text-slate-200 capitalize">{currentRole}</strong></span>
                </div>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
