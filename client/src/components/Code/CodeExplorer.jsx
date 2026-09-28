import React, { useState } from 'react';
import { Folder, FileCode2, ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';

const CodeExplorer = ({
  folders,
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const rootFolders = folders.filter((f) => !f.parentId);
  const rootFiles = files.filter((f) => !f.folderId);

  const handleNewFile = (e, folderId = null) => {
    e.stopPropagation();
    const name = prompt('Enter file name (e.g., index.js):');
    if (name) onCreateFile(name, folderId);
  };

  const handleNewFolder = (e, parentId = null) => {
    e.stopPropagation();
    const name = prompt('Enter folder name:');
    if (name) onCreateFolder(name, parentId);
  };

  const renderFolder = (folder) => {
    const isExpanded = expandedFolders[folder._id];
    const folderFiles = files.filter((f) => f.folderId === folder._id);
    const childFolders = folders.filter((f) => f.parentId === folder._id);

    return (
      <div key={folder._id} className="ml-2">
        <div
          className="flex items-center justify-between group px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 transition-colors"
          onClick={() => toggleFolder(folder._id)}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
            )}
            <Folder className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span className="text-xs truncate">{folder.name}</span>
          </div>
          <div className="hidden group-hover:flex items-center gap-1">
            <button onClick={(e) => handleNewFile(e, folder._id)} className="p-0.5 hover:text-white" title="New File">
              <Plus className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder._id); }} className="p-0.5 hover:text-red-400 text-slate-500" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="ml-2 border-l border-slate-800 pl-1">
            {childFolders.map(renderFolder)}
            {folderFiles.map(renderFile)}
          </div>
        )}
      </div>
    );
  };

  const renderFile = (file) => {
    const isActive = activeFile?._id === file._id;
    return (
      <div
        key={file._id}
        className={`flex items-center justify-between group px-2 py-1.5 ml-2 rounded cursor-pointer transition-colors ${
          isActive ? 'bg-brand-600/20 text-brand-300' : 'hover:bg-slate-800 text-slate-400'
        }`}
        onClick={() => onSelectFile(file)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs truncate">{file.name}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteFile(file._id); }}
          className="hidden group-hover:block p-0.5 hover:text-red-400 text-slate-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="text-sm select-none">
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace</span>
        <div className="flex items-center gap-1 text-slate-400">
          <button onClick={(e) => handleNewFile(e)} className="p-1 hover:text-white hover:bg-slate-800 rounded" title="New File">
            <FileCode2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => handleNewFolder(e)} className="p-1 hover:text-white hover:bg-slate-800 rounded" title="New Folder">
            <Folder className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div>
        {rootFolders.map(renderFolder)}
        {rootFiles.map(renderFile)}
        {rootFolders.length === 0 && rootFiles.length === 0 && (
          <div className="text-xs text-slate-500 px-2 mt-4 text-center">No files yet.</div>
        )}
      </div>
    </div>
  );
};

export default CodeExplorer;
