// Auth types
export interface AuthStatus {
  authenticated: boolean;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface DefaultsCheck {
  usingDefaults: boolean;
}

// Server types
export interface ServerStatus {
  running: boolean;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'unknown';
  startedAt: string | null;
}

export interface FilesReady {
  hasJar: boolean;
  hasAssets: boolean;
  ready: boolean;
}

export type DownloadStep = 'auth' | 'download' | 'extract' | 'complete';

export interface DownloadProgress {
  active: boolean;
  status: string;
  percentage: number;
  step: DownloadStep;
  authUrl: string | null;
  authCode: string | null;
  time: string;
}

// Console types
export type LogType = 'error' | 'warn' | 'auth' | 'info' | 'cmd' | '';

export interface LogEntry {
  text: string;
  type: LogType;
  timestamp: string;
}

export interface LogsHistoryData {
  logs: string[];
  hasMore: boolean;
  initial?: boolean;
  error?: string;
}

// Files types
export type FileType =
  | 'folder'
  | 'java'
  | 'archive'
  | 'json'
  | 'yaml'
  | 'config'
  | 'text'
  | 'log'
  | 'image'
  | 'script'
  | 'data'
  | 'audio'
  | 'file';

export interface FileEntry {
  name: string;
  icon: FileType;
  size: number | null;
  isDirectory: boolean;
  editable: boolean;
  permissions?: string;
}

export type EditorStatus = 'ready' | 'loading' | 'saving' | 'saved' | 'error' | string;

export interface EditorState {
  isOpen: boolean;
  filePath: string | null;
  content: string;
  status: EditorStatus;
  statusClass: string;
}

export interface UploadState {
  isVisible: boolean;
  isUploading: boolean;
  progress: number;
  text: string;
}

export interface FileListResult {
  success: boolean;
  path: string;
  files: FileEntry[];
  error?: string;
}

export interface FileReadResult {
  success: boolean;
  content?: string;
  binary?: boolean;
  error?: string;
}

export interface FileSaveResult {
  success: boolean;
  backup?: { success: boolean };
  error?: string;
}

export interface FileOperationResult {
  success: boolean;
  error?: string;
}

// Mods types - matches backend/src/services/mods.ts and modtale.ts
export interface InstalledMod {
  id: string;
  providerId: string;
  projectId: string | null;
  projectSlug?: string | null;
  projectTitle: string;
  projectIconUrl: string | null;
  versionId: string | null;
  versionName: string;
  classification: string;
  fileName: string;
  fileSize: number;
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
  isLocal?: boolean;
  fileExists?: boolean;
}

export interface ModVersion {
  id: string;
  version: string;
  downloads: number;
  gameVersion: string;
  releaseDate: string;
  fileSize: number;
  fileName: string;
}

export interface ModProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  classification: string;
  author: string;
  downloads: number;
  rating: number;
  iconUrl: string | null;
  versions: ModVersion[];
  latestVersion: ModVersion | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModUpdate {
  modId: string;
  currentVersion: string;
  latestVersion: string;
  latestVersionId: string;
  latestFileName?: string;
}

export interface ModSearchResult {
  success: boolean;
  projects?: ModProject[];
  total?: number;
  hasMore?: boolean;
  page?: number;
  error?: string;
}

export interface ModOperationResult {
  success: boolean;
  error?: string;
}

export interface ModUpdatesResult {
  success: boolean;
  updates?: ModUpdate[];
  error?: string;
}

// UI types
export type ToastType = 'error' | 'success' | 'info' | '';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export type TabId = 'setup' | 'files' | 'mods' | 'commands' | 'control';

// Socket types
export interface ActionStatus {
  action: string;
  success: boolean;
  error?: string;
}

export interface CommandResult {
  error?: string;
}

export interface DownloadStatusEvent {
  status: 'starting' | 'auth-required' | 'output' | 'extracting' | 'complete' | 'done' | 'error';
  message?: string;
}
