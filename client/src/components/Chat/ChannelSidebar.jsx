import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  Hash,
  Lock,
  Plus,
  Search,
  MessageSquare,
  Users,
  Circle,
  X,
  Loader2
} from 'lucide-react';
import api from '../../services/api';

const ChannelSidebar = ({ channels, activeChannel, onSelectChannel, onRefreshChannels, onlineUserIds }) => {
  const { currentWorkspace, members } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState('public');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!channelName.trim() || !currentWorkspace?._id) return;

    setLoading(true);
    try {
      const res = await api.post(`/workspaces/${currentWorkspace._id}/channels`, {
        name: channelName,
        type: channelType,
      });

      if (res.data && res.data.success) {
        setShowCreateModal(false);
        setChannelName('');
        onRefreshChannels();
        if (res.data.channel) {
          onSelectChannel(res.data.channel);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0d121f] flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-bold text-white">Channels</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 transition-all"
          title="Create Channel"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Filter search */}
      <div className="p-3 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter channels..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Text Channels ({filteredChannels.length})
        </div>

        {filteredChannels.map((c) => {
          const isActive = activeChannel?._id === c._id;
          return (
            <button
              key={c._id}
              onClick={() => onSelectChannel(c)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {c.type === 'private' ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                ) : (
                  <Hash className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                )}
                <span className="truncate">{c.name}</span>
              </div>

              {c.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-brand-500 text-white rounded-full">
                  {c.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Workspace Members Online Status List */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 max-h-48 overflow-y-auto">
        <div className="px-1 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>Team Members ({members.length})</span>
        </div>

        <div className="space-y-1.5">
          {members.map((m) => {
            const isOnline = onlineUserIds.includes(m.user?._id?.toString());
            return (
              <div key={m.memberId} className="flex items-center justify-between px-2 py-1 rounded-lg text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="relative">
                    <img
                      src={
                        m.user?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name || 'User')}`
                      }
                      alt={m.user?.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[#0d121f] ${
                        isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <span className="text-slate-300 text-xs truncate">{m.user?.name}</span>
                </div>
                <span className="text-[9px] text-slate-500 capitalize">{m.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-brand-400" />
                <span>Create Channel</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Channel Name</label>
                <div className="relative">
                  <span className="absolute left-3 top.1/2 top-2.5 text-xs text-slate-500 font-bold">#</span>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="e.g. dev-updates"
                    className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Privacy Level</label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="public">Public (Everyone in workspace)</option>
                  <option value="private">Private (Invite only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Channel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ChannelSidebar;
