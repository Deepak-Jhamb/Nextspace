import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, disconnectSocket } from '../services/socket';

export const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [members, setMembers] = useState([]);

  // Real-time states
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !currentWorkspace?._id) return;
    try {
      const response = await api.get(`/notifications?workspaceId=${currentWorkspace._id}`);
      if (response.data && response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('[Fetch Notifications Error]:', error.message);
    }
  }, [isAuthenticated, currentWorkspace?._id]);

  // Mark single notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Mark Read Error]:', error.message);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsRead = async () => {
    if (!currentWorkspace?._id) return;
    try {
      await api.patch('/notifications/read-all', { workspaceId: currentWorkspace._id });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[Mark All Read Error]:', error.message);
    }
  };

  // Connect Socket.IO when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      const s = connectSocket(token);
      setSocket(s);

      return () => {
        disconnectSocket();
        setSocket(null);
      };
    } else {
      disconnectSocket();
      setSocket(null);
    }
  }, [isAuthenticated, token]);

  // Join workspace room and attach event listeners on currentWorkspace change
  useEffect(() => {
    if (!socket || !currentWorkspace?._id) return;

    // Join room
    socket.emit('workspace:join', { workspaceId: currentWorkspace._id });

    // Fetch initial notifications
    fetchNotifications();

    // Socket Event Listeners
    const handleMemberOnline = ({ onlineUserIds: users }) => {
      setOnlineUserIds(users || []);
    };

    const handleMemberOffline = ({ onlineUserIds: users }) => {
      setOnlineUserIds(users || []);
    };

    const handleNewNotification = (notificationData) => {
      import('../utils/sound').then(module => module.playNotificationSound());
      setNotifications((prev) => [
        {
          _id: 'temp_' + Date.now(),
          type: notificationData.type,
          message: notificationData.message,
          read: false,
          createdAt: notificationData.createdAt || new Date(),
        },
        ...prev,
      ]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('member:online', handleMemberOnline);
    socket.on('member:offline', handleMemberOffline);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('member:online', handleMemberOnline);
      socket.off('member:offline', handleMemberOffline);
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, currentWorkspace?._id, fetchNotifications]);

  // Fetch workspace members whenever currentWorkspace changes
  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?._id) { setMembers([]); return; }
    try {
      const response = await api.get(`/workspaces/${currentWorkspace._id}/members`);
      if (response.data && response.data.success) {
        setMembers(response.data.members || []);
      }
    } catch (error) {
      console.error('[Members Fetch Error]:', error.message);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Fetch workspaces list for logged-in user
  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setMembers([]);
      return;
    }

    setLoadingWorkspaces(true);
    try {
      const response = await api.get('/workspaces');
      if (response.data && response.data.success) {
        const fetchedWorkspaces = response.data.workspaces || [];
        setWorkspaces(fetchedWorkspaces);

        const savedId = localStorage.getItem('nexushub_active_workspace_id');
        const active = fetchedWorkspaces.find((w) => w._id === savedId) || fetchedWorkspaces[0] || null;

        setCurrentWorkspace(active);
        if (active) {
          localStorage.setItem('nexushub_active_workspace_id', active._id);
        }
      }
    } catch (error) {
      console.error('[Workspace Fetch Error]:', error.response?.data?.message || error.message);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = (workspaceId) => {
    const target = workspaces.find((w) => w._id === workspaceId);
    if (target) {
      setCurrentWorkspace(target);
      localStorage.setItem('nexushub_active_workspace_id', target._id);
    }
  };

  const createWorkspace = async (name) => {
    try {
      const response = await api.post('/workspaces', { name });
      if (response.data && response.data.success) {
        await fetchWorkspaces();
        const newWs = response.data.workspace;
        if (newWs) {
          switchWorkspace(newWs._id);
        }
        return { success: true, workspace: newWs };
      }
      return { success: false, message: 'Failed to create workspace' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error creating workspace',
      };
    }
  };

  const inviteMember = async (workspaceId, email, role = 'MEMBER') => {
    try {
      const response = await api.post(`/workspaces/${workspaceId}/invite`, { email, role });
      return { success: true, invitation: response.data.invitation, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send invitation',
      };
    }
  };

  const updateMemberRole = async (workspaceId, userId, role) => {
    try {
      const response = await api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update member role',
      };
    }
  };

  const removeMember = async (workspaceId, userId) => {
    try {
      const response = await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove member',
      };
    }
  };

  const acceptInvite = async (token) => {
    try {
      const response = await api.post(`/invitations/${token}/accept`);
      if (response.data && response.data.success) {
        await fetchWorkspaces();
        if (response.data.workspaceId) {
          switchWorkspace(response.data.workspaceId);
        }
        return { success: true, message: response.data.message };
      }
      return { success: false, message: 'Failed to accept invitation' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid or expired invitation token',
      };
    }
  };

  const currentRole = currentWorkspace?.role || 'MEMBER';

  const value = {
    workspaces,
    currentWorkspace,
    currentRole,
    loadingWorkspaces,
    members,
    fetchMembers,
    socket,
    onlineUserIds,
    notifications,
    unreadCount,
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchWorkspaces,
    switchWorkspace,
    createWorkspace,
    inviteMember,
    updateMemberRole,
    removeMember,
    acceptInvite,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
