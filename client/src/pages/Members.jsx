import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Mail,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Copy,
  Check
} from 'lucide-react';

const Members = () => {
  const { currentWorkspace, currentRole, inviteMember, updateMemberRole, removeMember } = useWorkspace();
  const { currentUser } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [status, setStatus] = useState({ loading: false, success: false, message: '', inviteUrl: '' });
  const [actionMessage, setActionMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Permission flags based on user role matrix
  const isOwner = currentRole === 'OWNER';
  const isAdminOrOwner = currentRole === 'OWNER' || currentRole === 'ADMIN';

  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    try {
      const response = await api.get(`/workspaces/${currentWorkspace._id}/members`);
      if (response.data && response.data.success) {
        setMembers(response.data.members || []);
      }
    } catch (error) {
      console.error('[Fetch Members Error]:', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle Invite Form Submission
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !currentWorkspace?._id) return;

    setStatus({ loading: true, success: false, message: '', inviteUrl: '' });

    const result = await inviteMember(currentWorkspace._id, inviteEmail, inviteRole);

    if (result.success) {
      setStatus({
        loading: false,
        success: true,
        message: result.message || 'Invitation sent successfully!',
        inviteUrl: result.invitation?.inviteUrl || '',
      });
      fetchMembers();
    } else {
      setStatus({
        loading: false,
        success: false,
        message: result.message || 'Failed to send invitation',
        inviteUrl: '',
      });
    }
  };

  // Handle Changing Member Role (Owner Only)
  const handleRoleChange = async (targetUserId, newRole) => {
    if (!isOwner || !currentWorkspace?._id) return;

    const result = await updateMemberRole(currentWorkspace._id, targetUserId, newRole);
    if (result.success) {
      setActionMessage(result.message);
      fetchMembers();
      setTimeout(() => setActionMessage(''), 3000);
    } else {
      alert(result.message);
    }
  };

  // Handle Removing Member (Owner/Admin)
  const handleRemoveMember = async (targetUserId, targetUserName) => {
    if (!isAdminOrOwner || !currentWorkspace?._id) return;
    if (!window.confirm(`Are you sure you want to remove ${targetUserName} from this workspace?`)) {
      return;
    }

    const result = await removeMember(currentWorkspace._id, targetUserId);
    if (result.success) {
      setActionMessage(result.message);
      fetchMembers();
      setTimeout(() => setActionMessage(''), 3000);
    } else {
      alert(result.message);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            <span>Team Members & Roles</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Workspace: <strong className="text-white">{currentWorkspace?.name || 'Active Workspace'}</strong> • Your Role:{' '}
            <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-extrabold uppercase text-[10px]">
              {currentRole}
            </span>
          </p>
        </div>

        {/* Invite Member Button - Restricted to OWNER and ADMIN */}
        {isAdminOrOwner && (
          <button
            onClick={() => {
              setStatus({ loading: false, success: false, message: '', inviteUrl: '' });
              setShowInviteModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Role Permission Notice for Members */}
      {!isAdminOrOwner && (
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3 text-slate-400 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            You are currently a <strong className="text-slate-200 uppercase">Member</strong> in this workspace. Member management and invitation controls are restricted to Admins and Owners.
          </span>
        </div>
      )}

      {/* Members Directory Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredMembers.length} Workspace {filteredMembers.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-xs">Loading workspace members...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Joined Date</th>
                {isAdminOrOwner && <th className="p-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredMembers.map((m) => {
                const memberUser = m.user;
                const isTargetOwner = m.role === 'OWNER';
                const isSelf = memberUser?._id === currentUser?.id;

                return (
                  <tr key={m.memberId} className="hover:bg-slate-900/40 transition-colors">
                    {/* User Profile Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            memberUser?.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(memberUser?.name || 'User')}`
                          }
                          alt={memberUser?.name}
                          className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-800"
                        />
                        <div>
                          <p className="font-semibold text-white flex items-center gap-1.5">
                            <span>{memberUser?.name || 'Unknown User'}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{memberUser?.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Selection or Badge */}
                    <td className="p-4">
                      {isOwner && !isTargetOwner ? (
                        /* Owner can change roles via dropdown */
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(memberUser._id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-brand-300 font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MEMBER">MEMBER</option>
                        </select>
                      ) : (
                        /* Static Role Badge for non-owners or target OWNER */
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                            m.role === 'OWNER'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : m.role === 'ADMIN'
                              ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {m.role}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-slate-400 text-[11px]">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Active'}
                    </td>

                    {/* Actions: Remove Member */}
                    {isAdminOrOwner && (
                      <td className="p-4 text-right">
                        {!isTargetOwner && !isSelf && (
                          <button
                            onClick={() => handleRemoveMember(memberUser._id, memberUser.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Remove member from workspace"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-1">Invite Workspace Collaborator</h3>
            <p className="text-xs text-slate-400 mb-4">Send an invitation to join {currentWorkspace?.name}.</p>

            {status.message && (
              <div
                className={`mb-4 p-4 rounded-2xl flex items-start gap-3 text-xs ${
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
                  <p className="font-semibold">{status.success ? 'Invite Created' : 'Error'}</p>
                  <p className="mt-0.5">{status.message}</p>
                  {status.inviteUrl && (
                    <div className="mt-2 p-2 bg-slate-900 rounded-lg text-[10px] border border-slate-800 flex items-center justify-between text-brand-300">
                      <span className="truncate max-w-[240px]">{status.inviteUrl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(status.inviteUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="ml-2 p-1 text-slate-400 hover:text-white"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assigned Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="MEMBER">MEMBER (Standard Access)</option>
                  <option value="ADMIN">ADMIN (Workspace Management)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={status.loading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 flex items-center gap-2"
                >
                  {status.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
