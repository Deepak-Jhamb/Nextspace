import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import ChannelSidebar from '../components/Chat/ChannelSidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import api from '../services/api';

const Chat = () => {
  const { currentWorkspace, socket } = useWorkspace();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  // Fetch channels list for current workspace
  const fetchChannels = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      const res = await api.get(`/workspaces/${currentWorkspace._id}/channels`);
      if (res.data && res.data.success) {
        const fetchedChannels = res.data.channels || [];
        setChannels(fetchedChannels);

        // Auto select first channel (e.g. #general) if none selected
        if (fetchedChannels.length > 0 && !activeChannel) {
          setActiveChannel(fetchedChannels[0]);
        }
      }
    } catch (err) {
      console.error('[Fetch Channels Error]:', err);
    }
  }, [currentWorkspace?._id, activeChannel]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Socket online/offline and channel update listeners
  useEffect(() => {
    if (!socket) return;

    const handleOnline = ({ onlineUserIds }) => {
      setOnlineUserIds(onlineUserIds || []);
    };

    const handleOffline = ({ onlineUserIds }) => {
      setOnlineUserIds(onlineUserIds || []);
    };

    const handleChannelCreated = ({ channel }) => {
      setChannels((prev) => [...prev, channel]);
    };

    const handleChannelDeleted = ({ channelId }) => {
      setChannels((prev) => prev.filter((c) => c._id !== channelId));
      if (activeChannel?._id === channelId) {
        setActiveChannel(null);
      }
    };

    socket.on('member:online', handleOnline);
    socket.on('member:offline', handleOffline);
    socket.on('channel:created', handleChannelCreated);
    socket.on('channel:deleted', handleChannelDeleted);

    return () => {
      socket.off('member:online', handleOnline);
      socket.off('member:offline', handleOffline);
      socket.off('channel:created', handleChannelCreated);
      socket.off('channel:deleted', handleChannelDeleted);
    };
  }, [socket, activeChannel?._id]);

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden -m-6">
      <ChannelSidebar
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
        onRefreshChannels={fetchChannels}
        onlineUserIds={onlineUserIds}
      />
      <ChatWindow activeChannel={activeChannel} />
    </div>
  );
};

export default Chat;
