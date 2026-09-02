import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useWorkspace } from '../../hooks/useWorkspace';
import CreateWorkspaceModal from '../Workspace/CreateWorkspaceModal';
import StorageBar from '../Storage/StorageBar';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Users,
  Video,
  CreditCard,
  Settings,
  Layers,
  Plus,
  ChevronDown,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const Sidebar = ({ collapsed, onToggleCollapse }) => {
  const { currentWorkspace, workspaces, switchWorkspace, currentRole } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Files & Drive', path: '/files', icon: FolderKanban, badge: 'Drive' },
    { label: 'Chat & Channels', path: '/chat', icon: MessageSquare, badge: 'Chat' },
    { label: 'Team Members', path: '/members', icon: Users, badge: currentRole },
    { label: 'Meetings & Calls', path: '/meetings', icon: Video, badge: 'Live' },
    { label: 'Billing & Plan', path: '/billing', icon: CreditCard },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      <aside
        className={`border-r border-slate-800 bg-[#0a0e17] flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        } flex-shrink-0`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 border-b border-slate-800 px-3 flex items-center justify-between flex-shrink-0">
            {!collapsed && (
              <NavLink to="/" className="flex items-center gap-3 group min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 truncate">
                    NexusHub
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">Workspace Platform</p>
                </div>
              </NavLink>
            )}
            {collapsed && (
              <NavLink to="/" className="mx-auto group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5 text-white" />
                </div>
              </NavLink>
            )}
          </div>

          {/* Workspace Switcher — hidden when collapsed */}
          {!collapsed && (
            <div className="p-4 relative flex-shrink-0">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full p-3 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-brand-500/30">
                    {currentWorkspace?.name ? currentWorkspace.name.substring(0, 2).toUpperCase() : 'NH'}
                  </div>
                  <div className="truncate text-left">
                    <p className="text-xs font-semibold text-slate-200 truncate">{currentWorkspace?.name || 'Personal Workspace'}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-medium uppercase tracking-wider">
                      {currentRole}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors flex-shrink-0" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute left-4 right-4 mt-2 glass-panel rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Your Workspaces
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-1">
                    {workspaces.map((ws) => (
                      <button
                        key={ws._id}
                        onClick={() => { switchWorkspace(ws._id); setDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          ws._id === currentWorkspace?._id
                            ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {ws._id === currentWorkspace?._id && <Check className="w-3.5 h-3.5 text-brand-400" />}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-800 p-1">
                    <button
                      onClick={() => { setDropdownOpen(false); setIsModalOpen(true); }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-brand-400 hover:bg-brand-500/10 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collapsed: workspace avatar */}
          {collapsed && (
            <div className="px-3 py-3 flex-shrink-0">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title={currentWorkspace?.name || 'Switch Workspace'}
                className="w-10 h-10 mx-auto rounded-xl bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center text-xs border border-brand-500/30 hover:bg-brand-500/30 transition-all"
              >
                {currentWorkspace?.name ? currentWorkspace.name.substring(0, 2).toUpperCase() : 'NH'}
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2 space-y-1' : 'px-3 space-y-1'}`}>
            {!collapsed && (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Workspace Hub
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              if (collapsed) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                  </NavLink>
                );
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Storage Bar + Toggle */}
          <div className="flex-shrink-0 border-t border-slate-800">
            {!collapsed && <StorageBar compact={true} />}

            {/* Collapse Toggle Button */}
            <div className={`p-3 ${collapsed ? 'flex justify-center' : 'flex justify-end pr-4'}`}>
              <button
                onClick={onToggleCollapse}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
              >
                {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <CreateWorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Sidebar;
