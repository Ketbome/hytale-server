import { isAuthenticated } from '$lib/stores/auth';
import {
  addLog,
  clearLogs,
  extractTimestamp,
  formatTimestamp,
  getLogType,
  hasMoreHistory,
  initialLoadDone,
  isLoadingMore,
  loadedCount,
  logs,
  prependLogs
} from '$lib/stores/console';
import { currentPath, fileList, setEditorContent, setEditorStatus } from '$lib/stores/files';
import {
  apiConfigured,
  availableUpdates,
  currentPage,
  hasMore,
  installedMods,
  isModsLoading,
  searchResults,
  total
} from '$lib/stores/mods';
import { downloadProgress, downloaderAuth, filesReady, serverStatus } from '$lib/stores/server';
import { showToast } from '$lib/stores/ui';
import type {
  ActionStatus,
  CommandResult,
  DownloadStatusEvent,
  FileListResult,
  FileOperationResult,
  FileReadResult,
  FileSaveResult,
  FilesReady,
  InstalledMod,
  LogEntry,
  LogsHistoryData,
  ModOperationResult,
  ModProject,
  ModSearchResult,
  ModUpdatesResult,
  ServerStatus
} from '$lib/types';
import { type Socket, io } from 'socket.io-client';
import { _ } from 'svelte-i18n';
import { get, writable } from 'svelte/store';

export const socket = writable<Socket | null>(null);
export const isConnected = writable<boolean>(false);

let socketInstance: Socket | null = null;
let dlStartTime: number | null = null;
let dlTimer: ReturnType<typeof setInterval> | null = null;

export function connectSocket(): Socket {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io();

  socketInstance.on('connect', () => {
    isConnected.set(true);
    socketInstance?.emit('check-files');
  });

  socketInstance.on('disconnect', () => {
    isConnected.set(false);
  });

  socketInstance.on('connect_error', (err: Error) => {
    if (err.message === 'Authentication required' || err.message === 'Invalid or expired token') {
      disconnectSocket();
      isAuthenticated.set(false);
      showToast('Session expired. Please login again.', 'error');
    }
  });

  // Server status
  socketInstance.on('status', (s: ServerStatus) => {
    serverStatus.set({
      running: s.running,
      status: s.status || 'unknown',
      startedAt: s.startedAt
    });
  });

  // Files check - load files and mods after receiving server status
  socketInstance.on('files', (f: FilesReady) => {
    filesReady.set({
      hasJar: f.hasJar,
      hasAssets: f.hasAssets,
      ready: f.ready
    });
    // Load initial data
    socketInstance?.emit('files:list', '/');
    socketInstance?.emit('mods:check-config');
    socketInstance?.emit('mods:list');
  });

  // Downloader auth status
  socketInstance.on('downloader-auth', (a: boolean) => {
    downloaderAuth.set(a);
  });

  // Download status
  socketInstance.on('download-status', handleDownloadStatus);

  // Logs
  socketInstance.on('log', (msg: string) => {
    addLog(msg.trim());
  });

  socketInstance.on('logs:history', handleLogsHistory);

  // Command result
  socketInstance.on('command-result', (r: CommandResult) => {
    if (r.error) {
      addLog(`Error: ${r.error}`, 'error');
      showToast(get(_)('failed'), 'error');
    }
  });

  // Action status
  socketInstance.on('action-status', (s: ActionStatus) => {
    const t = get(_);
    if (s.success) {
      const msgs: Record<string, string> = {
        restart: t('restarted'),
        stop: t('stopped'),
        start: t('started'),
        wipe: t('dataWiped')
      };
      showToast(msgs[s.action] || t('done'));
    } else if (s.error) {
      showToast(`${s.action} ${t('failed')}`, 'error');
    }
  });

  // Error
  socketInstance.on('error', (m: string) => {
    addLog(m, 'error');
    showToast(m, 'error');
  });

  // File manager events
  socketInstance.on('files:list-result', (result: FileListResult) => {
    if (result.success) {
      currentPath.set(result.path);
      fileList.set(result.files);
    } else {
      showToast(`Error: ${result.error}`, 'error');
      fileList.set([]);
    }
  });

  socketInstance.on('files:read-result', (result: FileReadResult) => {
    if (result.success && result.content !== undefined) {
      setEditorContent(result.content);
    } else if (result.binary) {
      setEditorStatus('Cannot edit binary file', 'error');
    } else {
      setEditorStatus(`Error: ${result.error}`, 'error');
    }
  });

  socketInstance.on('files:save-result', (result: FileSaveResult) => {
    if (result.success) {
      setEditorStatus(result.backup?.success ? 'Saved (backup created)' : 'Saved', 'saved');
      showToast('File saved');
    } else {
      setEditorStatus(`Error: ${result.error}`, 'error');
      showToast('Save failed', 'error');
    }
  });

  socketInstance.on('files:mkdir-result', (result: FileOperationResult) => {
    if (result.success) {
      showToast('Folder created');
      emit('files:list', get(currentPath));
    } else {
      showToast(`Error: ${result.error}`, 'error');
    }
  });

  socketInstance.on('files:delete-result', (result: FileOperationResult) => {
    if (result.success) {
      showToast('Deleted');
      emit('files:list', get(currentPath));
    } else {
      showToast(`Error: ${result.error}`, 'error');
    }
  });

  socketInstance.on('files:rename-result', (result: FileOperationResult) => {
    if (result.success) {
      showToast('Renamed');
      emit('files:list', get(currentPath));
    } else {
      showToast(`Error: ${result.error}`, 'error');
    }
  });

  // Mods events
  socketInstance.on('mods:config-status', (result: { configured: boolean }) => {
    apiConfigured.set(result.configured);
  });

  socketInstance.on('mods:list-result', (result: { success: boolean; mods?: InstalledMod[]; error?: string }) => {
    isModsLoading.set(false);
    if (result.success && result.mods) {
      installedMods.set(result.mods);
    } else {
      showToast(`${get(_)('error')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:search-result', (result: ModSearchResult) => {
    isModsLoading.set(false);
    if (result.success) {
      searchResults.set(result.projects || []);
      total.set(result.total || 0);
      hasMore.set(result.hasMore || false);
      currentPage.set(result.page || 1);
    } else {
      showToast(`Error: ${result.error}`, 'error');
      searchResults.set([]);
    }
  });

  socketInstance.on('mods:install-result', (result: ModOperationResult) => {
    const t = get(_);
    if (result.success) {
      showToast(t('modInstalled'));
      emit('mods:list');
    } else {
      showToast(`${t('installFailed')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:uninstall-result', (result: ModOperationResult) => {
    const t = get(_);
    if (result.success) {
      showToast(t('modUninstalled'));
      emit('mods:list');
    } else {
      showToast(`${t('error')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:enable-result', (result: ModOperationResult) => {
    const t = get(_);
    if (result.success) {
      showToast(t('modEnabled'));
      emit('mods:list');
    } else {
      showToast(`${t('error')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:disable-result', (result: ModOperationResult) => {
    const t = get(_);
    if (result.success) {
      showToast(t('modDisabled'));
      emit('mods:list');
    } else {
      showToast(`${t('error')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:check-updates-result', (result: ModUpdatesResult) => {
    const t = get(_);
    if (result.success) {
      availableUpdates.set(result.updates || []);
      if (result.updates && result.updates.length > 0) {
        showToast(t('updatesAvailable', { values: { count: result.updates.length } }));
      } else {
        showToast(t('noUpdates'));
      }
    } else {
      showToast(`${t('error')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:update-result', (result: ModOperationResult) => {
    const t = get(_);
    if (result.success) {
      showToast(t('modUpdated'));
      emit('mods:list');
      emit('mods:check-updates');
    } else {
      showToast(`${t('updateFailed')}: ${result.error}`, 'error');
    }
  });

  socketInstance.on('mods:get-result', (result: { success: boolean; project?: ModProject; error?: string }) => {
    if (result.success && result.project) {
      const project = result.project;
      // Update search results with full project details
      searchResults.update((results) => {
        const index = results.findIndex((m) => m.id === project.id);
        if (index >= 0) {
          results[index] = project;
        }
        return results;
      });
      // Auto-install with version info now available
      const latestVersion = project.latestVersion || project.versions?.[0];
      if (latestVersion?.id) {
        emit('mods:install', {
          projectId: project.id,
          versionId: latestVersion.id,
          metadata: {
            projectTitle: project.title,
            projectSlug: project.slug,
            projectIconUrl: project.iconUrl,
            versionName: latestVersion.version,
            classification: project.classification,
            fileName: latestVersion.fileName
          }
        });
      }
    } else if (result.error) {
      showToast(`${get(_)('error')}: ${result.error}`, 'error');
    }
  });

  socket.set(socketInstance);
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  socket.set(null);
  isConnected.set(false);
}

export function emit(event: string, data?: unknown): void {
  if (socketInstance) {
    socketInstance.emit(event, data);
  }
}

function handleDownloadStatus(d: DownloadStatusEvent): void {
  console.log('[Download] Status:', d.status, 'Message:', d.message);
  switch (d.status) {
    case 'starting':
      dlStartTime = Date.now();
      startDlTimer();
      downloadProgress.set({
        active: true,
        status: get(_)('starting'),
        percentage: 5,
        step: 'auth',
        authUrl: null,
        authCode: null,
        time: '0s'
      });
      break;

    case 'auth-required':
      if (d.message) {
        addLog(d.message, 'auth');
        const url = d.message.match(/https:\/\/oauth\.accounts\.hytale\.com\S+/);
        const code = d.message.match(/(?:user_code[=:]\s*|code:\s*)([A-Za-z0-9]+)/i);
        downloadProgress.update((p) => ({
          ...p,
          status: get(_)('waitingAuth'),
          percentage: 10,
          authUrl: url ? url[0] : null,
          authCode: code ? code[1] : null
        }));
      }
      break;

    case 'output':
      if (d.message) {
        addLog(d.message);
        if (d.message.toLowerCase().includes('download')) {
          downloadProgress.update((p) => ({
            ...p,
            status: get(_)('downloading'),
            percentage: 30,
            step: 'download'
          }));
        }
        const pMatch = d.message.match(/(\d+)\.?\d*%/);
        if (pMatch) {
          const percent = Number.parseFloat(pMatch[0]);
          downloadProgress.update((p) => ({
            ...p,
            status: `${Math.round(percent)}%`,
            percentage: 30 + percent * 0.5
          }));
        }
      }
      break;

    case 'extracting':
      if (d.message) addLog(d.message, 'info');
      downloadProgress.update((p) => ({
        ...p,
        status: get(_)('extracting'),
        percentage: 85,
        step: 'extract'
      }));
      break;

    case 'complete':
      stopDlTimer();
      downloadProgress.update((p) => ({
        ...p,
        active: false,
        status: get(_)('done'),
        percentage: 100,
        step: 'complete',
        authUrl: null,
        authCode: null
      }));
      showToast(get(_)('downloadComplete'));
      addLog(get(_)('filesReadyMsg'), 'info');
      break;

    case 'done':
    case 'error':
      stopDlTimer();
      if (d.status === 'error') {
        downloadProgress.update((p) => ({
          ...p,
          status: get(_)('error'),
          active: false
        }));
        if (d.message) {
          showToast(d.message, 'error');
          addLog(`${get(_)('error')}: ${d.message}`, 'error');
        }
      } else {
        downloadProgress.update((p) => ({ ...p, active: false }));
      }
      break;
  }
}

function handleLogsHistory(data: LogsHistoryData): void {
  if (data.error) {
    console.error('Failed to load logs:', data.error);
    isLoadingMore.set(false);
    return;
  }

  if (!data.logs || data.logs.length === 0) {
    hasMoreHistory.set(data.hasMore !== false);
    isLoadingMore.set(false);
    return;
  }

  if (data.initial) {
    clearLogs();
  }

  const parsedLogs: LogEntry[] = data.logs
    .map((line) => {
      const ts = extractTimestamp(line);
      const cleaned = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s*/, '').trim();
      return {
        text: cleaned,
        type: getLogType(cleaned),
        timestamp: formatTimestamp(ts)
      };
    })
    .filter((l) => l.text);

  loadedCount.update((c) => c + data.logs.length);

  if (data.hasMore === false) {
    hasMoreHistory.set(false);
  }

  if (data.initial) {
    logs.set(parsedLogs);
    setTimeout(() => initialLoadDone.set(true), 500);
  } else {
    prependLogs(parsedLogs);
  }

  isLoadingMore.set(false);
}

function formatSec(s: number): string {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function startDlTimer(): void {
  dlTimer = setInterval(() => {
    if (dlStartTime) {
      const elapsed = Math.floor((Date.now() - dlStartTime) / 1000);
      downloadProgress.update((p) => ({ ...p, time: formatSec(elapsed) }));
    }
  }, 1000);
}

function stopDlTimer(): void {
  if (dlTimer) {
    clearInterval(dlTimer);
    dlTimer = null;
  }
}
