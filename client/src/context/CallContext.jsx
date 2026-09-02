import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

// WebRTC STUN Servers configuration
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }) => {
  const { socket, currentWorkspace } = useWorkspace();
  const { currentUser } = useAuth();

  const [activeMeeting, setActiveMeeting] = useState(null); // { meetingId, title, hostId, channelId }
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // socketId -> { peerConnection, user, stream }
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);

  const peerConnectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const audioAnalyserRef = useRef(null);

  // Audio level monitoring setup
  const setupAudioMonitoring = useCallback((stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      mediaStreamSource.connect(analyser);

      audioAnalyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser || !socket || !activeMeeting) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 25) {
          socket.emit('call:speaking', {
            meetingId: activeMeeting.meetingId,
            audioLevel: average,
          });
        }
      };

      const interval = setInterval(checkVolume, 300);
      return () => clearInterval(interval);
    } catch (e) {
      console.warn('[Audio Monitor Error]:', e);
    }
  }, [socket, activeMeeting]);

  // Clean up media streams & connections
  const leaveCall = useCallback(async () => {
    if (socket && activeMeeting) {
      socket.emit('call:leave', { meetingId: activeMeeting.meetingId });
    }

    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connections
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnectionsRef.current = {};

    setLocalStream(null);
    setPeers({});
    setActiveMeeting(null);
    setIsMinimized(false);
    setPinnedParticipantId(null);
    setActiveSpeakerId(null);
  }, [socket, activeMeeting]);

  // Handle End Call (Host/Admin)
  const endCall = useCallback(async () => {
    if (!currentWorkspace?._id || !activeMeeting) return;
    try {
      await api.post(`/workspaces/${currentWorkspace._id}/meetings/${activeMeeting.meetingId}/end`);
      if (socket) {
        socket.emit('call:end', { meetingId: activeMeeting.meetingId });
      }
    } catch (err) {
      console.error('[End Call Error]:', err);
    } finally {
      leaveCall();
    }
  }, [currentWorkspace?._id, activeMeeting, socket, leaveCall]);

  // Helper to create RTCPeerConnection for a remote peer socket
  const createPeerConnection = useCallback((targetSocketId, targetUser) => {
    const pc = new RTCPeerConnection(iceServers);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers((prev) => ({
        ...prev,
        [targetSocketId]: {
          socketId: targetSocketId,
          user: targetUser,
          stream: remoteStream,
        },
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionsRef.current[targetSocketId] = pc;
    return pc;
  }, [socket]);

  // Socket WebRTC Signal Listeners
  useEffect(() => {
    if (!socket || !activeMeeting) return;

    const handleExistingUsers = async ({ users }) => {
      for (const u of users) {
        if (u.socketId === socket.id) continue;
        const pc = createPeerConnection(u.socketId, u.user);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', {
            targetSocketId: u.socketId,
            offer,
          });
        } catch (e) {
          console.error('[Create Offer Error]:', e);
        }
      }
    };

    const handleUserJoined = (participant) => {
      if (participant.socketId === socket.id) return;
      createPeerConnection(participant.socketId, participant.user);
    };

    const handleOffer = async ({ callerSocketId, callerUser, offer }) => {
      let pc = peerConnectionsRef.current[callerSocketId];
      if (!pc) {
        pc = createPeerConnection(callerSocketId, callerUser);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', {
          targetSocketId: callerSocketId,
          answer,
        });
      } catch (e) {
        console.error('[Handle Offer Error]:', e);
      }
    };

    const handleAnswer = async ({ responderSocketId, answer }) => {
      const pc = peerConnectionsRef.current[responderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error('[Handle Answer Error]:', e);
        }
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[Add ICE Candidate Error]:', e);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setPeers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const handleSpeaking = ({ socketId, userId, audioLevel }) => {
      if (audioLevel > 20) {
        setActiveSpeakerId(socketId);
      }
    };

    const handleCallEnded = () => {
      leaveCall();
    };

    socket.on('call:existing-users', handleExistingUsers);
    socket.on('call:user-joined', handleUserJoined);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:user-left', handleUserLeft);
    socket.on('call:speaking', handleSpeaking);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:existing-users', handleExistingUsers);
      socket.off('call:user-joined', handleUserJoined);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:user-left', handleUserLeft);
      socket.off('call:speaking', handleSpeaking);
      socket.off('call:ended', handleCallEnded);
    };
  }, [socket, activeMeeting, createPeerConnection, leaveCall]);

  // Join existing call
  const joinCall = async (meetingId, channelId, title) => {
    if (!socket || !currentWorkspace?._id) return;

    try {
      // Get user camera & mic stream
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.warn('[Camera Permission Warning]: Falling back to audio only', err);
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      setupAudioMonitoring(stream);

      await api.post(`/workspaces/${currentWorkspace._id}/meetings/${meetingId}/join`);

      setActiveMeeting({
        meetingId,
        title: title || 'Workspace Huddle',
        channelId,
      });

      socket.emit('call:join', {
        meetingId,
        workspaceId: currentWorkspace._id,
      });
    } catch (error) {
      alert('Could not join video call: ' + (error.message || 'Media access failed'));
    }
  };

  // Start new call
  const startCall = async (channelId, title) => {
    if (!currentWorkspace?._id) return;

    try {
      const response = await api.post(`/workspaces/${currentWorkspace._id}/meetings/start`, {
        channelId,
        title,
      });

      if (response.data && response.data.success) {
        const meeting = response.data.meeting;
        await joinCall(meeting.meetingId, channelId, meeting.title);
      }
    } catch (error) {
      alert('Failed to start call: ' + (error.response?.data?.message || error.message));
    }
  };

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const value = {
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
    startCall,
    joinCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
