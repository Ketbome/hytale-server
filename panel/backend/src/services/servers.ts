import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import config from '../config/index.js';

const execAsync = promisify(exec);

export interface ServerConfig {
  javaXms: string;
  javaXmx: string;
  bindAddr: string;
  autoDownload: boolean;
  useG1gc: boolean;
  extraArgs: string;
  useMachineId: boolean; // Linux only - for CasaOS/Windows set to false
}

export interface Server {
  id: string;
  name: string;
  port: number;
  containerName: string;
  config: ServerConfig;
  createdAt: string;
}

export interface ServersData {
  version: number;
  servers: Server[];
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface ServerResult extends OperationResult {
  server?: Server;
}

export interface ServersListResult extends OperationResult {
  servers: Server[];
}

const DATA_PATH = config.data.path;
const SERVERS_FILE = path.join(DATA_PATH, 'servers.json');
const SERVERS_DIR = path.join(DATA_PATH, 'servers');

const DEFAULT_CONFIG: ServerConfig = {
  javaXms: '4G',
  javaXmx: '8G',
  bindAddr: '0.0.0.0',
  autoDownload: true,
  useG1gc: true,
  extraArgs: '',
  useMachineId: false // Default false for compatibility (CasaOS/Windows)
};

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_PATH, { recursive: true });
  await fs.mkdir(SERVERS_DIR, { recursive: true });
}

async function loadServersData(): Promise<ServersData> {
  try {
    await ensureDataDir();
    const content = await fs.readFile(SERVERS_FILE, 'utf-8');
    return JSON.parse(content) as ServersData;
  } catch {
    return { version: 1, servers: [] };
  }
}

async function saveServersData(data: ServersData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SERVERS_FILE, JSON.stringify(data, null, 2));
}

function generateDockerCompose(server: Server): string {
  const machineIdVolumes = server.config.useMachineId
    ? `      - /etc/machine-id:/etc/machine-id:ro
      - /sys/class/dmi/id:/sys/class/dmi/id:ro
`
    : '';

  // Use host path if available, otherwise relative path
  const hostDataPath = config.data.hostPath;
  const serverVolume = hostDataPath
    ? `${hostDataPath}/servers/${server.id}/server:/opt/hytale`
    : './server:/opt/hytale';

  return `services:
  ${server.containerName}:
    image: ketbom/hytale-server:latest
    container_name: ${server.containerName}
    restart: on-failure
    stdin_open: true
    tty: true
    privileged: true
    ports:
      - "${server.port}:${server.port}/udp"
    environment:
      TZ: UTC
      JAVA_XMS: ${server.config.javaXms}
      JAVA_XMX: ${server.config.javaXmx}
      BIND_PORT: ${server.port}
      BIND_ADDR: ${server.config.bindAddr}
      AUTO_DOWNLOAD: ${server.config.autoDownload}
      USE_G1GC: ${server.config.useG1gc}
      SERVER_EXTRA_ARGS: "${server.config.extraArgs}"
    volumes:
      - ${serverVolume}
${machineIdVolumes}`;
}

function generateContainerName(id: string): string {
  return `hytale-${id.slice(0, 8)}`;
}

async function findAvailablePort(servers: Server[]): Promise<number> {
  const usedPorts = new Set(servers.map((s) => s.port));
  let port = 5520;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}

export async function listServers(): Promise<ServersListResult> {
  try {
    const data = await loadServersData();
    return { success: true, servers: data.servers };
  } catch (e) {
    return { success: false, error: (e as Error).message, servers: [] };
  }
}

export async function getServer(id: string): Promise<ServerResult> {
  try {
    const data = await loadServersData();
    const server = data.servers.find((s) => s.id === id);
    if (!server) {
      return { success: false, error: 'Server not found' };
    }
    return { success: true, server };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface CreateServerParams {
  name: string;
  port?: number;
  config?: Partial<ServerConfig>;
}

export async function createServer(params: CreateServerParams): Promise<ServerResult> {
  try {
    const data = await loadServersData();

    const id = crypto.randomUUID();
    const port = params.port || (await findAvailablePort(data.servers));
    const containerName = generateContainerName(id);

    // Check port collision
    if (data.servers.some((s) => s.port === port)) {
      return { success: false, error: `Port ${port} already in use` };
    }

    const server: Server = {
      id,
      name: params.name,
      port,
      containerName,
      config: { ...DEFAULT_CONFIG, ...params.config },
      createdAt: new Date().toISOString()
    };

    // Create server directory
    const serverDir = path.join(SERVERS_DIR, id);
    await fs.mkdir(serverDir, { recursive: true });
    await fs.mkdir(path.join(serverDir, 'server'), { recursive: true });

    // Generate docker-compose.yml
    const compose = generateDockerCompose(server);
    await fs.writeFile(path.join(serverDir, 'docker-compose.yml'), compose);

    // Save to servers.json
    data.servers.push(server);
    await saveServersData(data);

    return { success: true, server };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateServer(id: string, updates: Partial<CreateServerParams>): Promise<ServerResult> {
  try {
    const data = await loadServersData();
    const index = data.servers.findIndex((s) => s.id === id);

    if (index < 0) {
      return { success: false, error: 'Server not found' };
    }

    const server = data.servers[index];

    // Update fields
    if (updates.name) server.name = updates.name;
    if (updates.port && updates.port !== server.port) {
      if (data.servers.some((s) => s.id !== id && s.port === updates.port)) {
        return { success: false, error: `Port ${updates.port} already in use` };
      }
      server.port = updates.port;
    }
    if (updates.config) {
      server.config = { ...server.config, ...updates.config };
    }

    // Regenerate docker-compose
    const serverDir = path.join(SERVERS_DIR, id);
    const compose = generateDockerCompose(server);
    await fs.writeFile(path.join(serverDir, 'docker-compose.yml'), compose);

    data.servers[index] = server;
    await saveServersData(data);

    return { success: true, server };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteServer(id: string, removeData = true): Promise<OperationResult> {
  try {
    const data = await loadServersData();
    const index = data.servers.findIndex((s) => s.id === id);

    if (index < 0) {
      return { success: false, error: 'Server not found' };
    }

    const server = data.servers[index];
    const serverDir = path.join(SERVERS_DIR, id);

    // Stop container first if running
    try {
      await execAsync(`docker stop ${server.containerName}`, { timeout: 30000 });
    } catch {
      // Container might not be running
    }

    // Remove container and volumes
    try {
      await execAsync('docker compose down -v --remove-orphans', { cwd: serverDir });
    } catch {
      // Compose might not exist
    }

    // Force remove container if still exists
    try {
      await execAsync(`docker rm -f ${server.containerName}`);
    } catch {
      // Container might not exist
    }

    // Remove data directory
    if (removeData) {
      await fs.rm(serverDir, { recursive: true, force: true });
    }

    // Remove from list
    data.servers.splice(index, 1);
    await saveServersData(data);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function startServer(id: string): Promise<OperationResult> {
  try {
    const result = await getServer(id);
    if (!result.success || !result.server) {
      return { success: false, error: result.error || 'Server not found' };
    }

    const serverDir = path.join(SERVERS_DIR, id);
    await execAsync('docker compose up -d', { cwd: serverDir });

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function stopServer(id: string): Promise<OperationResult> {
  try {
    const result = await getServer(id);
    if (!result.success || !result.server) {
      return { success: false, error: result.error || 'Server not found' };
    }

    const serverDir = path.join(SERVERS_DIR, id);
    await execAsync('docker compose down', { cwd: serverDir });

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function restartServer(id: string): Promise<OperationResult> {
  try {
    const result = await getServer(id);
    if (!result.success || !result.server) {
      return { success: false, error: result.error || 'Server not found' };
    }

    const serverDir = path.join(SERVERS_DIR, id);
    await execAsync('docker compose restart', { cwd: serverDir });

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function getServerDataPath(id: string): string {
  return path.join(SERVERS_DIR, id, 'server');
}

export function getServerModsPath(id: string): string {
  return path.join(SERVERS_DIR, id, 'server', 'mods');
}

// Docker Compose management
export interface ComposeResult extends OperationResult {
  content?: string;
}

export async function getServerCompose(id: string): Promise<ComposeResult> {
  try {
    const serverDir = path.join(SERVERS_DIR, id);
    const composePath = path.join(serverDir, 'docker-compose.yml');
    const content = await fs.readFile(composePath, 'utf-8');
    return { success: true, content };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function saveServerCompose(id: string, content: string): Promise<OperationResult> {
  try {
    const serverDir = path.join(SERVERS_DIR, id);
    const composePath = path.join(serverDir, 'docker-compose.yml');
    await fs.writeFile(composePath, content);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function regenerateServerCompose(id: string): Promise<ComposeResult> {
  try {
    const result = await getServer(id);
    if (!result.success || !result.server) {
      return { success: false, error: result.error || 'Server not found' };
    }

    const compose = generateDockerCompose(result.server);
    const serverDir = path.join(SERVERS_DIR, id);
    await fs.writeFile(path.join(serverDir, 'docker-compose.yml'), compose);

    return { success: true, content: compose };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
