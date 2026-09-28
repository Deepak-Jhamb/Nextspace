import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import debounce from 'lodash/debounce';

const CodeEditor = ({ activeFile, workspaceId }) => {
  const [content, setContent] = useState(activeFile.content || '');
  const [remoteChange, setRemoteChange] = useState(false);
  const editorRef = useRef(null);
  
  const socket = getSocket();

  useEffect(() => {
    setContent(activeFile.content || '');
    
    if (socket && activeFile._id) {
      socket.emit('code:join', { fileId: activeFile._id });
    }

    return () => {
      if (socket && activeFile._id) {
        socket.emit('code:leave', { fileId: activeFile._id });
      }
    };
  }, [activeFile, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleRemoteChange = (data) => {
      if (data.fileId === activeFile._id) {
        setRemoteChange(true);
        setContent(data.content);
      }
    };

    socket.on('code:change', handleRemoteChange);
    return () => {
      socket.off('code:change', handleRemoteChange);
    };
  }, [socket, activeFile._id]);

  // Debounced Autosave
  const saveContent = useCallback(
    debounce(async (fileId, newContent) => {
      try {
        await api.put(`/workspaces/${workspaceId}/code/files/${fileId}`, {
          content: newContent,
        });
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }, 1000),
    [workspaceId]
  );

  const handleChange = (value) => {
    if (remoteChange) {
      setRemoteChange(false);
      return;
    }
    
    const newContent = value || '';
    setContent(newContent);
    
    if (socket) {
      socket.emit('code:change', { fileId: activeFile._id, content: newContent });
    }
    
    saveContent(activeFile._id, newContent);
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117]">
      <div className="h-10 border-b border-slate-800 flex items-center px-4 bg-[#0a0e17]">
        <span className="text-sm text-slate-300 font-mono">{activeFile.name}</span>
      </div>
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={activeFile.language || 'javascript'}
          theme="vs-dark"
          value={content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            formatOnPaste: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
