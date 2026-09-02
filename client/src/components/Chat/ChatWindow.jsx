import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../../hooks/useAuth';
import { useCall } from '../../context/CallContext';
import api from '../../services/api';
import {
  Hash,
  Video,
  Send,
  Paperclip,
  Smile,
  Edit2,
  Trash2,
  PhoneCall,
  Loader2,
  CheckCheck,
  CornerDownRight,
  AtSign
} from 'lucide-react';

const ChatWindow = ({ activeChannel }) => {
  const { currentWorkspace, socket, members, currentRole } = useWorkspace();
  const { currentUser } = useAuth();
  const { startCall, joinCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isOwnerOrAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch channel messages
  const fetchMessages = useCallback(async () => {
    if (!currentWorkspace?._id || !activeChannel?._id) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/workspaces/${currentWorkspace._id}/channels/${activeChannel._id}/messages?limit=100`
      );
      if (res.data && res.data.success) {
        setMessages(res.data.messages || []);
        // Mark channel as read
        api.post(`/workspaces/${currentWorkspace._id}/channels/${activeChannel._id}/read`);
      }
    } catch (err) {
      console.error('[Fetch Messages Error]:', err);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [currentWorkspace?._id, activeChannel?._id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket event listeners for real-time messages & typing
  useEffect(() => {
    if (!socket || !activeChannel?._id) return;

    const handleNewMessage = ({ channelId, message }) => {
      if (channelId === activeChannel._id) {
        // Skip messages sent by the current user — they are already handled
        // by the optimistic update + API response replacement to avoid duplicates.
        const isOwnMessage = message.senderId?._id === currentUser?.id ||
                             message.senderId?._id?.toString() === currentUser?.id?.toString();
        if (isOwnMessage) return;

        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    const handleEditedMessage = ({ channelId, message }) => {
      if (channelId === activeChannel._id) {
        setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
      }
    };

    const handleDeletedMessage = ({ channelId, messageId }) => {
      if (channelId === activeChannel._id) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    };

    const handleTypingStart = ({ userId, userName, channelId }) => {
      if (channelId === activeChannel._id && userId !== currentUser?.id) {
        setTypingUsers((prev) => new Set(prev).add(userName));
      }
    };

    const handleTypingStop = ({ userId, channelId }) => {
      if (channelId === activeChannel._id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          // remove by clearing typing
          return next;
        });
      }
    };

    socket.on('chat:message:new', handleNewMessage);
    socket.on('chat:message:edited', handleEditedMessage);
    socket.on('chat:message:deleted', handleDeletedMessage);
    socket.on('typing:user:start', handleTypingStart);
    socket.on('typing:user:stop', handleTypingStop);

    return () => {
      socket.off('chat:message:new', handleNewMessage);
      socket.off('chat:message:edited', handleEditedMessage);
      socket.off('chat:message:deleted', handleDeletedMessage);
      socket.off('typing:user:start', handleTypingStart);
      socket.off('typing:user:stop', handleTypingStop);
    };
  }, [socket, activeChannel?._id, currentUser?.id]);

  // Handle Typing indicator emission
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Handle @mention popup trigger
    const lastWord = val.split(' ').pop();
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionFilter(lastWord.substring(1).toLowerCase());
    } else {
      setShowMentions(false);
    }

    if (socket && currentWorkspace?._id && activeChannel?._id) {
      socket.emit('chat:typing:start', {
        channelId: activeChannel._id,
        workspaceId: currentWorkspace._id,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('chat:typing:stop', {
          channelId: activeChannel._id,
          workspaceId: currentWorkspace._id,
        });
      }, 2000);
    }
  };

  // Insert mention into text
  const handleSelectMention = (userName) => {
    const words = text.split(' ');
    words.pop();
    setText([...words, `@${userName} `].join(' '));
    setShowMentions(false);
  };

  // Submit Message (Optimistic Send)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChannel?._id || !currentWorkspace?._id) return;

    const messageContent = text;
    setText('');
    setShowMentions(false);

    // Temp optimistic message object
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      channelId: activeChannel._id,
      senderId: {
        _id: currentUser?.id,
        name: currentUser?.name,
        email: currentUser?.email,
        avatar: currentUser?.avatar,
      },
      content: messageContent,
      replyTo,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyTo(null);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await api.post(
        `/workspaces/${currentWorkspace._id}/channels/${activeChannel._id}/messages`,
        {
          content: messageContent,
          replyTo: replyTo?._id || null,
        }
      );

      if (res.data && res.data.success) {
        // Replace temp optimistic message with backend saved message
        setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data.message : m)));
      }
    } catch (err) {
      alert('Failed to send message: ' + (err.response?.data?.message || err.message));
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  };

  // Handle Edit Message
  const handleSaveEdit = async (messageId) => {
    if (!editText.trim()) return;
    try {
      const res = await api.patch(
        `/workspaces/${currentWorkspace._id}/channels/${activeChannel._id}/messages/${messageId}`,
        { content: editText }
      );
      if (res.data && res.data.success) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? res.data.message : m)));
        setEditingMessageId(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(
        `/workspaces/${currentWorkspace._id}/channels/${activeChannel._id}/messages/${messageId}`
      );
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Helper to format mention tags in text content
  const renderFormattedContent = (content) => {
    if (!content) return null;
    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold text-xs border border-brand-500/30">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredMentionMembers = members.filter((m) =>
    m.user?.name?.toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0e17] overflow-hidden">
      {/* Channel Header Bar */}
      <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-[#0d121f]/90">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>#{activeChannel?.name || 'general'}</span>
              {activeChannel?.type === 'private' && (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold">
                  Private
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              {activeChannel?.description || 'Workspace discussion channel'}
            </p>
          </div>
        </div>

        {/* Start Call Button */}
        <button
          onClick={() => startCall(activeChannel?._id, `#${activeChannel?.name} Call`)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
        >
          <Video className="w-4 h-4" />
          <span>Start Call</span>
        </button>
      </div>

      {/* Message Thread Scroll View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            <span className="text-xs">Loading channel messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
              <Hash className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Welcome to #{activeChannel?.name}!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This is the beginning of the #{activeChannel?.name} channel. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId?._id === currentUser?.id;
            const isSystemCall = msg.systemType === 'CALL_START';

            if (isSystemCall) {
              return (
                <div key={msg._id} className="p-4 my-2 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{msg.content}</p>
                      <p className="text-[10px] text-purple-300">Live group video meeting</p>
                    </div>
                  </div>
                  <button
                    onClick={() => joinCall(msg.meetingId, activeChannel._id, msg.content)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Join Call
                  </button>
                </div>
              );
            }

            return (
              <div
                key={msg._id}
                className={`group flex items-start gap-3 p-2.5 rounded-2xl transition-colors hover:bg-slate-900/50 ${
                  isSelf ? 'flex-row-reverse' : ''
                }`}
              >
                {/* User Avatar */}
                <img
                  src={
                    msg.senderId?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderId?.name || 'User')}`
                  }
                  alt={msg.senderId?.name}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-800 flex-shrink-0"
                />

                <div className={`max-w-lg space-y-1 ${isSelf ? 'text-right' : ''}`}>
                  {/* Sender Name & Time */}
                  <div className={`flex items-center gap-2 text-[11px] ${isSelf ? 'justify-end' : ''}`}>
                    <span className="font-semibold text-white">{msg.senderId?.name || 'Collaborator'}</span>
                    <span className="text-slate-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Reply Quote Bubble */}
                  {msg.replyTo && (
                    <div className="p-2 bg-slate-900/90 rounded-xl text-[11px] border border-slate-800 flex items-center gap-2 text-slate-400 mb-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-brand-400" />
                      <span>
                        <strong className="text-slate-300">{msg.replyTo.senderId?.name}:</strong>{' '}
                        {msg.replyTo.content}
                      </span>
                    </div>
                  )}

                  {/* Message Content Bubble */}
                  {editingMessageId === msg._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-brand-500 rounded-xl text-xs text-white"
                      />
                      <button
                        onClick={() => handleSaveEdit(msg._id)}
                        className="px-2.5 py-1 bg-brand-600 text-white rounded-lg text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`inline-block p-3 rounded-2xl text-xs ${
                        isSelf
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-200'
                      }`}
                    >
                      {renderFormattedContent(msg.content)}
                      {msg.editedAt && <span className="ml-1 text-[9px] opacity-60">(edited)</span>}
                    </div>
                  )}

                  {/* Hover Action Buttons */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[10px] ${isSelf ? 'justify-end' : ''}`}>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="text-slate-400 hover:text-white"
                    >
                      Reply
                    </button>
                    {isSelf && (
                      <button
                        onClick={() => {
                          setEditingMessageId(msg._id);
                          setEditText(msg.content);
                        }}
                        className="text-slate-400 hover:text-brand-400"
                      >
                        Edit
                      </button>
                    )}
                    {(isSelf || isOwnerOrAdmin) && (
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live Typing Status Bar */}
      {typingUsers.size > 0 && (
        <div className="px-6 py-1 text-[11px] text-brand-400 font-medium animate-pulse flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping" />
          <span>{Array.from(typingUsers).join(', ')} is typing...</span>
        </div>
      )}

      {/* Reply Banner */}
      {replyTo && (
        <div className="px-6 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="w-4 h-4 text-brand-400" />
            <span>Replying to <strong className="text-white">{replyTo.senderId?.name}</strong>: {replyTo.content}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Message Input Box */}
      <div className="p-4 border-t border-slate-800 bg-[#0d121f] relative">
        {/* @Mention Suggestion Popup */}
        {showMentions && (
          <div className="absolute bottom-full left-4 mb-2 w-64 glass-panel rounded-2xl border border-slate-800 shadow-2xl p-2 z-30 max-h-48 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">Mention Team Member</div>
            {filteredMentionMembers.map((m) => (
              <button
                key={m.memberId}
                type="button"
                onClick={() => handleSelectMention(m.user.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800 text-xs text-white transition-all text-left"
              >
                <img
                  src={m.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user.name)}`}
                  alt={m.user.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span>{m.user.name}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder={`Message #${activeChannel?.name || 'channel'}... Use @ to mention`}
              className="w-full pl-4 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setText((prev) => prev + ' @')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-400"
              title="Mention member"
            >
              <AtSign className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            className="p-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-2xl shadow-lg shadow-brand-500/20 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
