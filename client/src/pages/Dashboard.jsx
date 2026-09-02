import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useNavigate } from 'react-router-dom';
import StorageBar from '../components/Storage/StorageBar';
import api from '../services/api';
import {
  FolderKanban,
  Users,
  Video,
  HardDrive,
  Upload,
  UserPlus,
  Zap,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Sparkles
} from 'lucide-react';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { currentWorkspace, members } = useWorkspace();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?._id) return;
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [filesRes, channelsRes, meetingsRes] = await Promise.all([
          api.get(`/workspaces/${currentWorkspace._id}/files`),
          api.get(`/workspaces/${currentWorkspace._id}/channels`),
          api.get(`/workspaces/${currentWorkspace._id}/meetings/active`),
        ]);

        if (filesRes.data && filesRes.data.success) {
          setFiles(filesRes.data.files || []);
        }
        if (channelsRes.data && channelsRes.data.success) {
          setChannels(channelsRes.data.channels || []);
        }
        if (meetingsRes.data && meetingsRes.data.success) {
          setActiveCalls(meetingsRes.data.meetings || []);
        }
      } catch (err) {
        console.error('[Dashboard Fetch Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentWorkspace?._id]);

  const recentFiles = files.slice(0, 5);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalStorageBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const stats = [
    { label: 'Total Files Stored', value: `${files.length} Files`, change: '+Live Sync', icon: FolderKanban, color: 'from-blue-500 to-indigo-600' },
    { label: 'Active Team Members', value: `${members.length} Members`, change: 'Workspace team', icon: Users, color: 'from-emerald-500 to-teal-600' },
    { label: 'Live Video Spaces', value: `${activeCalls.length} Active Calls`, change: activeCalls.length > 0 ? 'Live Now' : 'Idle', icon: Video, color: 'from-purple-500 to-pink-600' },
    { label: 'Channels & Hubs', value: `${channels.length} Channels`, change: 'Slack-like chat', icon: MessageSquare, color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-brand-900/60 via-indigo-950/40 to-slate-900 border border-brand-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 border border-brand-500/40 rounded-full text-brand-300 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>{currentWorkspace?.name || 'NexusHub Workspace'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser?.name || 'Collaborator'}!
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Your real-time collaboration hub is active. Manage files, connect in chat channels, or jump into group video calls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/members')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
            >
              <UserPlus className="w-4 h-4 text-brand-400" />
              <span>Invite Member</span>
            </button>
            <button
              onClick={() => navigate('/files')}
              className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white tracking-tight">{stat.value}</span>
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Storage Bar & Recent Files & Launchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Storage Bar & Recent Files */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workspace Storage Indicator */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-400" />
              <span>Workspace Storage Quota</span>
            </h2>
            <StorageBar compact={false} />
          </div>

          {/* Recent Files Table */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Recent Files Stored</h2>
                <p className="text-[11px] text-slate-400">Latest cloud uploads across this workspace</p>
              </div>
              <button
                onClick={() => navigate('/files')}
                className="text-xs text-brand-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View Drive</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentFiles.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No files uploaded yet in this workspace.
                </div>
              ) : (
                recentFiles.map((file) => (
                  <div key={file._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-white font-semibold">{file.name}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                      {file.mimeType?.split('/')[1] || 'file'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Launchpad */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Quick Launchpad</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/chat')}
                className="p-3 bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 rounded-xl text-left transition-all group"
              >
                <MessageSquare className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">Team Chat</p>
                <p className="text-[10px] text-slate-400">Join channels</p>
              </button>

              <button
                onClick={() => navigate('/meetings')}
                className="p-3 bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 rounded-xl text-left transition-all group"
              >
                <Video className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">Video Call</p>
                <p className="text-[10px] text-slate-400">Start huddle</p>
              </button>

              <button
                onClick={() => navigate('/files')}
                className="p-3 bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 rounded-xl text-left transition-all group"
              >
                <Upload className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">Cloud Drive</p>
                <p className="text-[10px] text-slate-400">Manage files</p>
              </button>

              <button
                onClick={() => navigate('/members')}
                className="p-3 bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 rounded-xl text-left transition-all group"
              >
                <Users className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">Members</p>
                <p className="text-[10px] text-slate-400">Manage roles</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
