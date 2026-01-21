import { derived, writable } from 'svelte/store';

export interface ServerConfig {
  javaXms: string;
  javaXmx: string;
  bindAddr: string;
  autoDownload: boolean;
  useG1gc: boolean;
  extraArgs: string;
  useMachineId: boolean;
}

export interface Server {
  id: string;
  name: string;
  port: number;
  containerName: string;
  config: ServerConfig;
  createdAt: string;
  status?: 'running' | 'stopped' | 'unknown';
}

export const servers = writable<Server[]>([]);
export const activeServerId = writable<string | null>(null);
export const serversLoading = writable<boolean>(false);

export const activeServer = derived([servers, activeServerId], ([$servers, $activeServerId]) => {
  if (!$activeServerId) return null;
  return $servers.find((s) => s.id === $activeServerId) || null;
});

export function updateServerStatus(id: string, status: 'running' | 'stopped' | 'unknown'): void {
  servers.update((list) => list.map((s) => (s.id === id ? { ...s, status } : s)));
}

export function updateServer(id: string, updates: Partial<Server>): void {
  servers.update((list) => list.map((s) => (s.id === id ? { ...s, ...updates } : s)));
}

export function leaveServer(): void {
  activeServerId.set(null);
}
