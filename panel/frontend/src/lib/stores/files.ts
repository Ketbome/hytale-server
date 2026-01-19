import type { EditorState, FileEntry, FileType, UploadState } from '$lib/types';
import { writable } from 'svelte/store';

export const currentPath = writable<string>('/');
export const fileList = writable<FileEntry[]>([]);

export const editorState = writable<EditorState>({
  isOpen: false,
  filePath: null,
  content: '',
  status: 'ready',
  statusClass: ''
});

export const uploadState = writable<UploadState>({
  isVisible: false,
  isUploading: false,
  progress: 0,
  text: ''
});

export const FILE_ICONS: Record<FileType, string> = {
  folder: 'DIR',
  java: 'JAR',
  archive: 'ZIP',
  json: 'JSON',
  yaml: 'YML',
  config: 'CFG',
  text: 'TXT',
  log: 'LOG',
  image: 'IMG',
  script: 'SCR',
  data: 'DAT',
  audio: 'SND',
  file: 'FILE'
};

export function openEditor(filePath: string): void {
  editorState.set({
    isOpen: true,
    filePath,
    content: '',
    status: 'loading',
    statusClass: ''
  });
}

export function closeEditor(): void {
  editorState.set({
    isOpen: false,
    filePath: null,
    content: '',
    status: 'ready',
    statusClass: ''
  });
}

export function setEditorContent(content: string): void {
  editorState.update((s) => ({ ...s, content, status: 'ready', statusClass: '' }));
}

export function setEditorStatus(status: string, statusClass = ''): void {
  editorState.update((s) => ({ ...s, status, statusClass }));
}
