import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../hooks/useAuth';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Pin,
  Users,
  Volume2,
  Sparkles
} from 'lucide-react';

/**
 * Individual Video Stream Tile helper
 */
const VideoTile = ({ stream, isLocal = false, user, isSpeaking = false, isPinned = false, onClick }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border transition-all cursor-pointer group ${
        isSpeaking ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20' : 'border-slate-800'
      } ${isPinned ? 'ring-2 ring-brand-500' : ''}`}
    >
      {stream && stream.getVideoTracks().some((t) => t.enabled) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-[#0b0f19]">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`}
            alt={user?.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-700 mb-2"
          />
          <span className="text-xs font-semibold text-white">{user?.name}</span>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-semibold text-white flex items-center gap-1.5 z-10">
        <span>{isLocal ? `${user?.name || 'You'} (You)` : user?.name || 'Peer'}</span>
        {isSpeaking && <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />}
      </div>

      {isPinned && (
        <div className="absolute top-2 right-2 p-1 bg-brand-600 rounded-md text-white z-10">
          <Pin className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

const CallUI = () => {
  const {
    activeMeeting,
    localStream,
    peers,
    isMuted,
    isCameraOff,
    isMinimized,
    pinnedParticipantId,
    activeSpeakerId,
    setIsMinimized,
    setPinnedParticipantId,
    leaveCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const { currentUser } = useAuth();

  if (!activeMeeting) return null;

  const peerList = Object.values(peers);
  const totalCount = peerList.length + 1; // + local

  // Determine main stage video track
  let mainStream = localStream;
  let mainUser = currentUser;
  let mainId = 'local';

  if (pinnedParticipantId) {
    if (pinnedParticipantId !== 'local' && peers[pinnedParticipantId]) {
      mainStream = peers[pinnedParticipantId].stream;
      mainUser = peers[pinnedParticipantId].user;
      mainId = pinnedParticipantId;
    }
  } else if (activeSpeakerId && peers[activeSpeakerId]) {
    mainStream = peers[activeSpeakerId].stream;
    mainUser = peers[activeSpeakerId].user;
    mainId = activeSpeakerId;
  }

  // --- FLOATING MINI-VIEW (Top-Right ~220x165px) ---
  if (isMinimized) {
    return (
      <div className="fixed top-20 right-6 z-50 w-60 h-44 glass-panel rounded-3xl p-1.5 border border-brand-500/40 shadow-2xl shadow-brand-500/20 flex flex-col justify-between animate-in zoom-in-95 duration-200">
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950">
          <VideoTile
            stream={mainStream}
            isLocal={mainId === 'local'}
            user={mainUser}
            isSpeaking={activeSpeakerId === mainId}
          />

          {/* Mini-View Top Bar */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20">
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-bold text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{totalCount} in call</span>
            </span>

            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-lg text-slate-200 hover:text-white transition-all"
              title="Expand Call"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg text-white transition-all ${
                isMuted ? 'bg-red-600' : 'bg-black/60 hover:bg-black/90 backdrop-blur-md'
              }`}
            >
              {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </button>
            <button
              onClick={leaveCall}
              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
              title="Leave Call"
            >
              <PhoneOff className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- FULL-SCREEN / EXPANDED CALL MODAL ---
  return (
    <div className="fixed inset-0 z-50 bg-[#070a12]/95 backdrop-blur-xl flex flex-col justify-between p-6 animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{activeMeeting.title || 'Workspace Live Call'}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live HD Mesh
              </span>
              • {totalCount} Active {totalCount === 1 ? 'Participant' : 'Participants'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
            title="Minimize call floating view"
          >
            <Minimize2 className="w-4 h-4 text-brand-400" />
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 my-6 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* Main Stage Spotlight Tile */}
        <div className="lg:col-span-3 h-full min-h-[380px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-950">
          <VideoTile
            stream={mainStream}
            isLocal={mainId === 'local'}
            user={mainUser}
            isSpeaking={activeSpeakerId === mainId}
            isPinned={pinnedParticipantId === mainId}
            onClick={() => setPinnedParticipantId(pinnedParticipantId === mainId ? null : mainId)}
          />
        </div>

        {/* Side Thumbnails Strip */}
        <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Participants ({totalCount})</span>
            {pinnedParticipantId && (
              <button
                onClick={() => setPinnedParticipantId(null)}
                className="text-[10px] text-brand-400 hover:underline font-medium"
              >
                Unpin
              </button>
            )}
          </div>

          {/* Local Tile */}
          <div className="h-36">
            <VideoTile
              stream={localStream}
              isLocal={true}
              user={currentUser}
              isSpeaking={activeSpeakerId === 'local'}
              isPinned={pinnedParticipantId === 'local'}
              onClick={() => setPinnedParticipantId('local')}
            />
          </div>

          {/* Peers Tiles */}
          {peerList.map((peer) => (
            <div key={peer.socketId} className="h-36">
              <VideoTile
                stream={peer.stream}
                isLocal={false}
                user={peer.user}
                isSpeaking={activeSpeakerId === peer.socketId}
                isPinned={pinnedParticipantId === peer.socketId}
                onClick={() => setPinnedParticipantId(peer.socketId)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-2xl font-semibold flex items-center gap-2 shadow-lg transition-all ${
            isMuted ? 'bg-red-600 text-white shadow-red-600/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <span className="text-xs">{isMuted ? 'Muted' : 'Mute'}</span>
        </button>

        <button
          onClick={toggleCamera}
          className={`p-4 rounded-2xl font-semibold flex items-center gap-2 shadow-lg transition-all ${
            isCameraOff ? 'bg-red-600 text-white shadow-red-600/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          <span className="text-xs">{isCameraOff ? 'Camera Off' : 'Camera'}</span>
        </button>

        <button
          onClick={leaveCall}
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
        >
          <PhoneOff className="w-5 h-5" />
          <span>Leave Call</span>
        </button>

        <button
          onClick={endCall}
          className="p-4 bg-slate-900 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-2xl font-semibold text-xs transition-all"
        >
          <span>End Call for All</span>
        </button>
      </div>
    </div>
  );
};

export default CallUI;
