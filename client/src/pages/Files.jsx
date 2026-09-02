import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import StorageBar from '../components/Storage/StorageBar';
import CreateFolderModal from '../components/Files/CreateFolderModal';
import {
  FolderKanban,
  Folder,
  FolderPlus,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
  FileCode,
  Download,
  Trash2,
  Upload,
  Grid,
  List,
  Search,
  ChevronRight,
  Home,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const Files = () => {
  const { currentWorkspace, currentRole } = useWorkspace();
  const { currentUser } = useAuth();

  const [currentFolder, setCurrentFolder] = useState(null); // null = Root
  const [folderHistory, setFolderHistory] = useState([]); // [{ id, name }]
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fileInputRef = useRef(null);

  const isOwnerOrAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';

  // Fetch folders & files for current workspace and folder level
  const fetchData = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    setError('');

    const folderParam = currentFolder ? currentFolder._id : 'root';

    try {
      const [foldersRes, filesRes] = await Promise.all([
        api.get(`/workspaces/${currentWorkspace._id}/folders?parentFolderId=${folderParam}`),
        api.get(`/workspaces/${currentWorkspace._id}/files?folderId=${folderParam}`),
      ]);

      if (foldersRes.data.success) setFolders(foldersRes.data.folders || []);
      if (filesRes.data.success) setFiles(filesRes.data.files || []);
    } catch (err) {
      console.error('[Fetch Files/Folders Error]:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, currentFolder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate into subfolder
  const handleOpenFolder = (folder) => {
    setFolderHistory((prev) => [...prev, folder]);
    setCurrentFolder(folder);
  };

  // Navigate to breadcrumb level
  const handleNavigateBreadcrumb = (index) => {
    if (index === -1) {
      // Root
      setCurrentFolder(null);
      setFolderHistory([]);
    } else {
      const newHistory = folderHistory.slice(0, index + 1);
      setFolderHistory(newHistory);
      setCurrentFolder(newHistory[newHistory.length - 1]);
    }
  };

  // Upload file handler
  const handleFileUpload = async (fileToUpload) => {
    if (!fileToUpload || !currentWorkspace?._id) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', fileToUpload);
    if (currentFolder?._id) {
      formData.append('folderId', currentFolder._id);
    }

    try {
      const response = await api.post(`/workspaces/${currentWorkspace._id}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.success) {
        setSuccess(`File "${fileToUpload.name}" uploaded successfully!`);
        fetchData();
        setRefreshTrigger((prev) => prev + 1);
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err) {
      // Catch HTTP 413 Storage Quota Exceeded or validation error
      const message = err.response?.data?.message || 'File upload failed.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Download File via signed URL
  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await api.get(`/workspaces/${currentWorkspace._id}/files/${fileId}/download`);
      if (response.data && response.data.signedUrl) {
        const link = document.createElement('a');
        link.href = response.data.signedUrl;
        link.target = '_blank';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate download link.');
    }
  };

  // Delete File handler
  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const response = await api.delete(`/workspaces/${currentWorkspace._id}/files/${fileId}`);
      if (response.data && response.data.success) {
        setSuccess(`Deleted "${fileName}".`);
        fetchData();
        setRefreshTrigger((prev) => prev + 1);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete file.');
    }
  };

  // Delete Folder handler
  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Are you sure you want to delete folder "${folderName}" and all its contents?`)) return;

    try {
      const response = await api.delete(`/workspaces/${currentWorkspace._id}/folders/${folderId}`);
      if (response.data && response.data.success) {
        setSuccess(`Folder "${folderName}" deleted.`);
        fetchData();
        setRefreshTrigger((prev) => prev + 1);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete folder.');
    }
  };

  // Get File Type Icon & Accent Color
  const getFileMeta = (mimeType, name) => {
    const ext = name.split('.').pop().toLowerCase();

    if (mimeType.startsWith('image/')) return { icon: ImageIcon, color: 'text-purple-400', bg: 'bg-purple-500/10' };
    if (mimeType.startsWith('video/')) return { icon: Film, color: 'text-blue-400', bg: 'bg-blue-500/10' };
    if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10' };
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: FileArchive, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py'].includes(ext)) return { icon: FileCode, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    return { icon: FileText, color: 'text-brand-400', bg: 'bg-brand-500/10' };
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-brand-400" />
            <span>Files & Storage Drive</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Workspace cloud storage for <strong className="text-slate-200">{currentWorkspace?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
          >
            <FolderPlus className="w-4 h-4 text-brand-400" />
            <span>New Folder</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Storage Capacity Bar Component */}
      <StorageBar refreshTrigger={refreshTrigger} />

      {/* Error / Success Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-400 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload Error</p>
            <p className="mt-0.5 text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-6 border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl bg-slate-900/40 text-center transition-all cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-200">Drag and drop any file here to upload</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Enforces 1 GB workspace quota (Max file size 500 MB)</p>
      </div>

      {/* Breadcrumbs Navigation & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-slate-800">
        {/* Folder Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => handleNavigateBreadcrumb(-1)}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-brand-400" />
            <span>Root</span>
          </button>

          {folderHistory.map((folder, idx) => (
            <React.Fragment key={folder._id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <button
                onClick={() => handleNavigateBreadcrumb(idx)}
                className={`hover:text-white transition-colors truncate max-w-[120px] ${
                  idx === folderHistory.length - 1 ? 'font-bold text-brand-400' : 'text-slate-300'
                }`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search & Grid/List View Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files & folders..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Files & Folders Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs">Fetching workspace files and folders...</p>
        </div>
      ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
        <div className="p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">This folder is empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upload files or create subfolders to start building your workspace storage structure.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders Section */}
          {filteredFolders.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder._id}
                    className="p-3 bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 rounded-2xl flex items-center justify-between group transition-all cursor-pointer"
                    onClick={() => handleOpenFolder(folder)}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Folder className="w-5 h-5 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-white truncate">{folder.name}</span>
                    </div>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder._id, folder.name);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {filteredFiles.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Files</h3>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => {
                    const meta = getFileMeta(file.mimeType, file.name);
                    const Icon = meta.icon;
                    const canDelete =
                      isOwnerOrAdmin || file.uploadedBy?._id === currentUser?.id || file.uploadedBy === currentUser?.id;

                    return (
                      <div
                        key={file._id}
                        className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-brand-500/40 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${meta.bg} border border-slate-800 flex items-center justify-center`}>
                              <Icon className={`w-5 h-5 ${meta.color}`} />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDownload(file._id, file.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-all"
                                title="Download File"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteFile(file._id, file.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Delete File"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-white truncate group-hover:text-brand-300 transition-colors" title={file.name}>
                            {file.name}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
                          <span>{formatSize(file.size)}</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                        <th className="p-3.5 font-semibold">Name</th>
                        <th className="p-3.5 font-semibold">Uploaded By</th>
                        <th className="p-3.5 font-semibold">Size</th>
                        <th className="p-3.5 font-semibold">Uploaded Date</th>
                        <th className="p-3.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {filteredFiles.map((file) => {
                        const meta = getFileMeta(file.mimeType, file.name);
                        const Icon = meta.icon;
                        const canDelete =
                          isOwnerOrAdmin || file.uploadedBy?._id === currentUser?.id || file.uploadedBy === currentUser?.id;

                        return (
                          <tr key={file._id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3.5 flex items-center gap-3 font-medium text-white">
                              <Icon className={`w-4 h-4 ${meta.color}`} />
                              <span className="truncate max-w-xs">{file.name}</span>
                            </td>
                            <td className="p-3.5 text-slate-400">{file.uploadedBy?.name || 'User'}</td>
                            <td className="p-3.5 text-slate-400">{formatSize(file.size)}</td>
                            <td className="p-3.5 text-slate-400">{new Date(file.createdAt).toLocaleDateString()}</td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDownload(file._id, file.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteFile(file._id, file.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Folder Modal */}
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        currentFolderId={currentFolder?._id}
        onCreated={() => {
          fetchData();
          setSuccess('New folder created!');
          setTimeout(() => setSuccess(''), 3000);
        }}
      />
    </div>
  );
};

export default Files;
