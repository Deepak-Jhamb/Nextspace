import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import api from '../../services/api';
import { HardDrive, AlertTriangle } from 'lucide-react';

const StorageBar = ({ compact = false, refreshTrigger = 0 }) => {
  const { currentWorkspace } = useWorkspace();
  const [usage, setUsage] = useState({
    totalUsed: 0,
    storageLimit: 1073741824, // 1 GB default
    percentage: 0,
    fileCount: 0,
  });

  const fetchStorageUsage = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      const response = await api.get(`/workspaces/${currentWorkspace._id}/storage-usage`);
      if (response.data && response.data.success) {
        setUsage({
          totalUsed: response.data.totalUsed || 0,
          storageLimit: response.data.storageLimit || 1073741824,
          percentage: response.data.percentage || 0,
          fileCount: response.data.fileCount || 0,
        });
      }
    } catch (error) {
      console.error('[Storage Usage Fetch Error]:', error.message);
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    fetchStorageUsage();
  }, [fetchStorageUsage, refreshTrigger]);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getBarColor = () => {
    if (usage.percentage >= 90) return 'from-red-500 to-rose-600';
    if (usage.percentage >= 75) return 'from-amber-500 to-orange-500';
    return 'from-brand-500 to-indigo-500';
  };

  if (compact) {
    return (
      <div className="p-4 m-3 bg-gradient-to-b from-slate-900/80 to-[#111726] border border-slate-800/80 rounded-2xl">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-1.5">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-brand-400" />
            <span>Workspace Storage</span>
          </div>
          {usage.percentage >= 90 && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full bg-gradient-to-r ${getBarColor()} transition-all duration-500`}
            style={{ width: `${usage.percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{formatSize(usage.totalUsed)} of {formatSize(usage.storageLimit)}</span>
          <span className={`font-semibold ${usage.percentage >= 90 ? 'text-red-400' : 'text-brand-400'}`}>
            {usage.percentage}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Storage Capacity</h3>
            <p className="text-[11px] text-slate-400">{usage.fileCount} {usage.fileCount === 1 ? 'file' : 'files'} stored</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-extrabold text-white">
            {formatSize(usage.totalUsed)}{' '}
            <span className="text-slate-500 font-normal">/ {formatSize(usage.storageLimit)}</span>
          </p>
          <p className={`text-[10px] font-semibold mt-0.5 ${usage.percentage >= 90 ? 'text-red-400' : 'text-brand-400'}`}>
            {usage.percentage}% quota consumed
          </p>
        </div>
      </div>

      <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full bg-gradient-to-r ${getBarColor()} transition-all duration-500`}
          style={{ width: `${usage.percentage}%` }}
        />
      </div>
    </div>
  );
};

export default StorageBar;
