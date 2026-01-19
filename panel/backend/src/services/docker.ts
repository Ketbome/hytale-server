import type { Container } from 'dockerode';
import Docker from 'dockerode';
import config from '../config/index.js';

const docker = new Docker({ socketPath: config.docker.socketPath });
let cachedContainer: Container | null = null;

export interface ContainerStatus {
  running: boolean;
  status: string;
  startedAt?: string;
  health?: string;
  error?: string;
}

export interface CommandResult {
  success: boolean;
  error?: string;
}

export async function getContainer(): Promise<Container | null> {
  try {
    cachedContainer = docker.getContainer(config.container.name);
    return cachedContainer;
  } catch {
    return null;
  }
}

export async function getStatus(): Promise<ContainerStatus> {
  try {
    const c = await getContainer();
    if (!c) return { running: false, status: 'not found' };

    const info = await c.inspect();
    const status = {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.StartedAt,
      health: info.State.Health?.Status || 'unknown'
    };
    console.log('[Docker] Status:', status.running ? 'RUNNING' : 'STOPPED', status.status);
    return status;
  } catch (e) {
    console.error('[Docker] Status error:', (e as Error).message);
    return { running: false, status: 'not found', error: (e as Error).message };
  }
}

export async function execCommand(cmd: string, timeout = 30000): Promise<string> {
  const c = await getContainer();
  if (!c) throw new Error('Container not found');

  const exec = await c.exec({
    Cmd: ['sh', '-c', cmd],
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start({});

  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => resolve(output || 'Command timed out'), timeout);

    stream.on('data', (chunk: Buffer) => {
      output += chunk.slice(8).toString('utf8');
    });
    stream.on('end', () => {
      clearTimeout(timer);
      resolve(output);
    });
    stream.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function sendCommand(cmd: string): Promise<CommandResult> {
  try {
    await execCommand(`echo "${cmd}" > /tmp/hytale-console`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function restart(): Promise<CommandResult> {
  try {
    const c = await getContainer();
    if (!c) throw new Error('Container not found');
    await c.restart();
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function stop(): Promise<CommandResult> {
  try {
    const c = await getContainer();
    if (!c) throw new Error('Container not found');
    console.log('[Docker] Stopping container...');
    await c.stop();
    console.log('[Docker] Container stopped');
    return { success: true };
  } catch (e) {
    const error = (e as Error).message;
    // Container already stopped is not an error
    if (error.includes('304') || error.includes('already stopped') || error.includes('not running')) {
      console.log('[Docker] Container already stopped');
      return { success: true };
    }
    console.error('[Docker] Stop failed:', error);
    return { success: false, error };
  }
}

export async function start(): Promise<CommandResult> {
  try {
    const c = await getContainer();
    if (!c) throw new Error('Container not found');
    console.log('[Docker] Starting container...');
    await c.start();
    console.log('[Docker] Container started');
    return { success: true };
  } catch (e) {
    const error = (e as Error).message;
    // Container already running is not an error
    if (error.includes('304') || error.includes('already started') || error.includes('already running')) {
      console.log('[Docker] Container already running');
      return { success: true };
    }
    console.error('[Docker] Start failed:', error);
    return { success: false, error };
  }
}

export async function getLogs(options: { tail?: number } = {}): Promise<NodeJS.ReadableStream> {
  const c = await getContainer();
  if (!c) throw new Error('Container not found');

  return c.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: options.tail || 100,
    timestamps: true
  });
}

export async function getLogsHistory(tail = 500): Promise<string[]> {
  const c = await getContainer();
  if (!c) throw new Error('Container not found');

  return new Promise((resolve, reject) => {
    c.logs(
      {
        follow: false,
        stdout: true,
        stderr: true,
        tail,
        timestamps: true
      },
      (err, buffer) => {
        if (err) return reject(err);

        if (!buffer || buffer.length === 0) {
          return resolve([]);
        }

        const text = buffer.toString('utf8');
        const lines = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        resolve(lines);
      }
    );
  });
}

export async function getArchive(path: string): Promise<NodeJS.ReadableStream> {
  const c = await getContainer();
  if (!c) throw new Error('Container not found');
  return c.getArchive({ path });
}

export async function putArchive(stream: NodeJS.ReadableStream, options: { path: string }): Promise<void> {
  const c = await getContainer();
  if (!c) throw new Error('Container not found');
  await c.putArchive(stream, options);
}
