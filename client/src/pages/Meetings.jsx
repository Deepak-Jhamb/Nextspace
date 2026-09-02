import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useCall } from '../context/CallContext';
import api from '../services/api';
import {
  Video,
  Plus,
  Users,
  Clock,
  PhoneCall,
  Loader2,
  Calendar,
  Sparkles,
  Zap
} from 'lucide-react';

const Meetings = () => {
  const { currentWorkspace } = useWorkspace();
  const { startCall, joinCall } = useCall();
  const [activeMeetings, setActiveMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveMeetings = async () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`/workspaces/${currentWorkspace._id}/meetings/active`);
      if (res.data && res.data.success) {
        setActiveMeetings(res.data.meetings || []);
      }
    } catch (err) {
      console.error('[Fetch Active Meetings Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveMeetings();
  }, [currentWorkspace?._id]);

  const handleStartInstantCall = () => {
    const title = prompt('Enter Video Huddle Title:', `${currentWorkspace?.name || 'Workspace'} Huddle`);
    if (title !== null) {
      startCall(null, title);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-brand-400" />
            <span>Live Video Rooms & Meetings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mesh WebRTC group video conferencing spaces for workspace team members
          </p>
        </div>

        <button
          onClick={handleStartInstantCall}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Start Instant Meeting</span>
        </button>
      </div>

      {/* Active Meetings Grid */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white">Active Live Calls in Workspace</h2>
          </div>
          <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
            {activeMeetings.length} Live Room{activeMeetings.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            <span className="text-xs">Checking active meetings...</span>
          </div>
        ) : activeMeetings.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Active Meetings Right Now</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start an instant video room or launch a call directly from any text channel!
            </p>
            <button
              onClick={handleStartInstantCall}
              className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Start Instant Meeting</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMeetings.map((meeting) => (
              <div
                key={meeting._id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between hover:border-purple-500/50 transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {meeting.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Host: <strong className="text-slate-200">{meeting.hostId?.name || 'Collaborator'}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-purple-400" />
                    <span>{meeting.participants?.length || 1} participant(s) inside</span>
                  </p>
                </div>

                <button
                  onClick={() => joinCall(meeting.meetingId, meeting.channelId, meeting.title)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Join Call</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Meetings;
