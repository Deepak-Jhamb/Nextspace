import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import api from '../../services/api';
import CodeExplorer from '../components/Code/CodeExplorer';
import CodeEditor from '../components/Code/CodeEditor';
import { Layers } from 'lucide-react';

const CodeWorkspace = () => {
  const { currentWorkspace } = useWorkspace();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace?._id) {
      fetchCodeTree();
    }
  }, [currentWorkspace]);

  const fetchCodeTree = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${currentWorkspace._id}/code`);
      setFolders(res.data.data.folders);
      setFiles(res.data.data.files);
    } catch (error) {
      console.error('Error fetching code tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name, parentId = null) => {
    try {
      const res = await api.post(`/workspaces/${currentWorkspace._id}/code/folders`, { name, parentId });
      setFolders([...folders, res.data.data]);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleCreateFile = async (name, folderId = null) => {
    try {
      const res = await api.post(`/workspaces/${currentWorkspace._id}/code/files`, { name, folderId });
      setFiles([...files, res.data.data]);
      setActiveFile(res.data.data);
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await api.delete(`/workspaces/${currentWorkspace._id}/code/folders/${folderId}`);
      setFolders(folders.filter((f) => f._id !== folderId));
      setFiles(files.filter((f) => f.folderId !== folderId)); // MVP simplification
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/workspaces/${currentWorkspace._id}/code/files/${fileId}`);
      setFiles(files.filter((f) => f._id !== fileId));
      if (activeFile?._id === fileId) {
        setActiveFile(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Please select a workspace.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0b0f19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar Explorer */}
      <div className="w-64 border-r border-slate-800 bg-[#0a0e17] flex-shrink-0 flex flex-col">
        <div className="p-3 border-b border-slate-800">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-400" />
            Explorer
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-xs text-slate-500 p-2">Loading...</div>
          ) : (
            <CodeExplorer
              folders={folders}
              files={files}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
            />
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
        {activeFile ? (
          <CodeEditor
            activeFile={activeFile}
            workspaceId={currentWorkspace._id}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Layers className="w-12 h-12 text-slate-700 mb-4" />
            <p>Select a file to start coding</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeWorkspace;
