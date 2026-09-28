const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

// Map tracking connected users per workspace room: workspaceId -> Map(userId -> Set(socketId))
const onlineWorkspaceUsers = new Map();

// Map tracking meeting participants: meetingId -> Map(socketId -> { socketId, userId, user })
const activeMeetingRooms = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('Authentication error. Token missing.'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_key_nexushub_2026'
      );

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error. User not found.'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket Auth Error]:', error.message);
      next(new Error('Authentication error. Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: User ${socket.user.name} (${socket.user._id}) on socket ${socket.id}`);
    socket.join(`user_${socket.user._id.toString()}`);

    // --- WORKSPACE & ONLINE STATUS EVENTS ---
    socket.on('workspace:join', ({ workspaceId }) => {
      if (!workspaceId) return;

      const roomName = `workspace_${workspaceId}`;
      socket.join(roomName);
      socket.currentWorkspaceId = workspaceId;

      if (!onlineWorkspaceUsers.has(workspaceId)) {
        onlineWorkspaceUsers.set(workspaceId, new Map());
      }
      const workspaceMap = onlineWorkspaceUsers.get(workspaceId);
      const userSockets = workspaceMap.get(socket.user._id.toString()) || new Set();
      userSockets.add(socket.id);
      workspaceMap.set(socket.user._id.toString(), userSockets);

      const onlineUserIds = Array.from(workspaceMap.keys());

      io.to(roomName).emit('member:online', {
        userId: socket.user._id.toString(),
        onlineUserIds,
      });
    });

    // --- CHAT TYPING EVENTS ---
    socket.on('chat:typing:start', ({ channelId, workspaceId }) => {
      if (!workspaceId) return;
      socket.to(`workspace_${workspaceId}`).emit('typing:user:start', {
        userId: socket.user._id.toString(),
        userName: socket.user.name,
        channelId,
      });
    });

    socket.on('chat:typing:stop', ({ channelId, workspaceId }) => {
      if (!workspaceId) return;
      socket.to(`workspace_${workspaceId}`).emit('typing:user:stop', {
        userId: socket.user._id.toString(),
        channelId,
      });
    });

    // --- WEBRTC SIGNALING EVENTS ---
    socket.on('call:join', ({ meetingId, workspaceId }) => {
      if (!meetingId) return;

      const callRoom = `meeting_${meetingId}`;
      socket.join(callRoom);
      socket.currentMeetingId = meetingId;

      if (!activeMeetingRooms.has(meetingId)) {
        activeMeetingRooms.set(meetingId, new Map());
      }

      const participantsMap = activeMeetingRooms.get(meetingId);

      // Existing participants before joining
      const existingParticipants = Array.from(participantsMap.values());

      // Store joining user's socket details
      const participantInfo = {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      };

      participantsMap.set(socket.id, participantInfo);

      // Send existing participants list to joining client
      socket.emit('call:existing-users', {
        users: existingParticipants,
      });

      // Notify existing call participants that a new peer joined
      socket.to(callRoom).emit('call:user-joined', participantInfo);

      console.log(`[WebRTC Call]: User ${socket.user.name} joined call ${meetingId}. Total participants: ${participantsMap.size}`);
    });

    socket.on('call:offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('call:offer', {
        callerSocketId: socket.id,
        callerUser: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        offer,
      });
    });

    socket.on('call:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('call:answer', {
        responderSocketId: socket.id,
        answer,
      });
    });

    socket.on('call:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('call:ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    socket.on('call:speaking', ({ meetingId, audioLevel }) => {
      if (!meetingId) return;
      socket.to(`meeting_${meetingId}`).emit('call:speaking', {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        audioLevel,
      });
    });

    socket.on('call:leave', ({ meetingId }) => {
      const targetMeetingId = meetingId || socket.currentMeetingId;
      if (!targetMeetingId) return;

      const callRoom = `meeting_${targetMeetingId}`;
      socket.leave(callRoom);

      if (activeMeetingRooms.has(targetMeetingId)) {
        const participantsMap = activeMeetingRooms.get(targetMeetingId);
        participantsMap.delete(socket.id);

        if (participantsMap.size === 0) {
          activeMeetingRooms.delete(targetMeetingId);
        }
      }

      socket.to(callRoom).emit('call:user-left', {
        socketId: socket.id,
        userId: socket.user._id.toString(),
      });

      socket.currentMeetingId = null;
    });

    socket.on('call:end', ({ meetingId, workspaceId }) => {
      if (!meetingId) return;
      const callRoom = `meeting_${meetingId}`;
      io.to(callRoom).emit('call:ended', { meetingId });
      activeMeetingRooms.delete(meetingId);
    });

    // --- CODE EDITOR EVENTS ---
    socket.on('code:join', ({ fileId }) => {
      if (!fileId) return;
      socket.join(`codefile_${fileId}`);
    });

    socket.on('code:leave', ({ fileId }) => {
      if (!fileId) return;
      socket.leave(`codefile_${fileId}`);
    });

    socket.on('code:change', ({ fileId, content }) => {
      if (!fileId) return;
      socket.to(`codefile_${fileId}`).emit('code:change', {
        fileId,
        content,
        userId: socket.user._id.toString(),
      });
    });

    socket.on('code:cursor', ({ fileId, position }) => {
      if (!fileId) return;
      socket.to(`codefile_${fileId}`).emit('code:cursor', {
        fileId,
        position,
        userId: socket.user._id.toString(),
        userName: socket.user.name,
      });
    });

    // --- DISCONNECT HANDLER ---
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);

      // Handle leaving active WebRTC call on disconnect
      if (socket.currentMeetingId && activeMeetingRooms.has(socket.currentMeetingId)) {
        const meetingId = socket.currentMeetingId;
        const callRoom = `meeting_${meetingId}`;
        const participantsMap = activeMeetingRooms.get(meetingId);

        participantsMap.delete(socket.id);
        if (participantsMap.size === 0) {
          activeMeetingRooms.delete(meetingId);
        }

        io.to(callRoom).emit('call:user-left', {
          socketId: socket.id,
          userId: socket.user._id.toString(),
        });
      }

      // Handle workspace offline status update
      if (socket.currentWorkspaceId && onlineWorkspaceUsers.has(socket.currentWorkspaceId)) {
        const workspaceId = socket.currentWorkspaceId;
        const workspaceMap = onlineWorkspaceUsers.get(workspaceId);
        const userIdStr = socket.user._id.toString();

        if (workspaceMap.has(userIdStr)) {
          const userSockets = workspaceMap.get(userIdStr);
          userSockets.delete(socket.id);

          if (userSockets.size === 0) {
            workspaceMap.delete(userIdStr);
            const roomName = `workspace_${workspaceId}`;
            const onlineUserIds = Array.from(workspaceMap.keys());

            io.to(roomName).emit('member:offline', {
              userId: userIdStr,
              onlineUserIds,
            });
          }
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

const emitToWorkspace = (workspaceId, event, data) => {
  if (io && workspaceId) {
    io.to(`workspace_${workspaceId}`).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

const getOnlineUsersInWorkspace = (workspaceId) => {
  if (onlineWorkspaceUsers.has(workspaceId)) {
    return Array.from(onlineWorkspaceUsers.get(workspaceId).keys());
  }
  return [];
};

module.exports = {
  initSocket,
  getIO,
  emitToWorkspace,
  getOnlineUsersInWorkspace,
};
