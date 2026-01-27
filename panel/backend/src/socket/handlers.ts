import type { Server, Socket } from 'socket.io';
import * as docker from '../services/docker.js';
import * as downloader from '../services/downloader.js';
import * as files from '../services/files.js';
import * as mods from '../services/mods.js';
import * as modtale from '../services/modtale.js';
import * as servers from '../services/servers.js';

interface LogsMoreParams {
  currentCount?: number;
  batchSize?: number;
}

interface SaveParams {
  path: string;
  content: string;
  createBackup?: boolean;
}

interface RenameParams {
  oldPath: string;
  newPath: string;
}

interface InstallParams {
  projectId: string;
  versionId: string;
  metadata: {
    versionName: string;
    projectTitle: string;
    classification?: string;
    fileName?: string;
    projectIconUrl?: string | null;
    projectSlug?: string | null;
  };
}

interface UpdateParams {
  modId: string;
  versionId: string;
  metadata: {
    versionName: string;
    fileName?: string;
  };
}

interface ServerContext {
  serverId: string | null;
  containerName: string | null;
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected');

    // Server context for this socket
    const ctx: ServerContext = {
      serverId: null,
      containerName: null
    };

    let logStream: NodeJS.ReadableStream | null = null;

    async function connectLogStream(tail = 0): Promise<void> {
      if (logStream) {
        try {
          (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        } catch {
          /* ignore */
        }
        logStream = null;
      }

      if (!ctx.containerName) return;

      try {
        logStream = await docker.getLogs({ tail, containerName: ctx.containerName });

        logStream.on('data', (chunk: Buffer) => {
          socket.emit('log', chunk.slice(8).toString('utf8'));
        });

        logStream.on('error', () => {
          logStream = null;
        });
        logStream.on('end', () => {
          logStream = null;
        });
      } catch (e) {
        socket.emit('error', `Failed to connect to container logs: ${(e as Error).message}`);
      }
    }

    // Join a server room and set context
    socket.on('server:join', async (serverId: string) => {
      // Leave previous room and cleanup
      if (ctx.serverId) {
        socket.leave(`server:${ctx.serverId}`);
        if (logStream) {
          try {
            (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
          } catch {
            /* ignore */
          }
          logStream = null;
        }
      }

      const result = await servers.getServer(serverId);
      if (!result.success || !result.server) {
        socket.emit('server:join-error', { error: 'Server not found' });
        return;
      }

      ctx.serverId = serverId;
      ctx.containerName = result.server.containerName;
      socket.join(`server:${serverId}`);

      // Check if server is running first
      const status = await docker.getStatus(ctx.containerName);
      socket.emit('status', status);

      // Only check files/auth/logs if container is running
      if (status.running) {
        socket.emit('files', await files.checkServerFiles(ctx.containerName));
        socket.emit('downloader-auth', await files.checkAuth(ctx.containerName));

        try {
          const history = await docker.getLogsHistory(500, ctx.containerName);
          socket.emit('logs:history', { logs: history, initial: true });
        } catch (e) {
          console.error('Failed to get log history:', (e as Error).message);
        }

        await connectLogStream();
      } else {
        // Server is offline - send empty/default values
        socket.emit('files', { hasJar: false, hasAssets: false, ready: false });
        socket.emit('downloader-auth', false);
        socket.emit('logs:history', { logs: [], initial: true });
      }

      socket.emit('server:joined', { serverId, server: result.server });
    });

    socket.on('server:leave', () => {
      if (ctx.serverId) {
        socket.leave(`server:${ctx.serverId}`);
      }
      ctx.serverId = null;
      ctx.containerName = null;

      if (logStream) {
        try {
          (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        } catch {
          /* ignore */
        }
        logStream = null;
      }
    });

    socket.on('command', async (cmd: string) => {
      if (!ctx.containerName) {
        socket.emit('command-result', { cmd, success: false, error: 'No server selected' });
        return;
      }
      const result = await docker.sendCommand(cmd, ctx.containerName);
      socket.emit('command-result', { cmd, ...result });
    });

    socket.on('download', async () => {
      if (!ctx.containerName || !ctx.serverId) return;
      await downloader.downloadServerFiles(socket, ctx.containerName, ctx.serverId);
    });

    socket.on('restart', async () => {
      if (!ctx.containerName) return;
      socket.emit('action-status', { action: 'restart', status: 'starting' });
      const result = await docker.restart(ctx.containerName);
      socket.emit('action-status', { action: 'restart', ...result });

      if (result.success) {
        setTimeout(async () => {
          await connectLogStream(50);
          socket.emit('status', await docker.getStatus(ctx.containerName!));
        }, 2000);
      }
    });

    socket.on('stop', async () => {
      if (!ctx.containerName) return;
      console.log('[Socket] Stop requested');
      socket.emit('action-status', { action: 'stop', status: 'starting' });
      const result = await docker.stop(ctx.containerName);
      console.log('[Socket] Stop result:', result);
      socket.emit('action-status', { action: 'stop', ...result });
    });

    socket.on('kill', async () => {
      if (!ctx.containerName) return;
      console.log('[Socket] Kill (force stop) requested');
      socket.emit('action-status', { action: 'kill', status: 'starting' });
      const result = await docker.kill(ctx.containerName);
      console.log('[Socket] Kill result:', result);
      socket.emit('action-status', { action: 'kill', ...result });
    });

    socket.on('start', async () => {
      if (!ctx.serverId) return;
      console.log('[Socket] Start requested');
      socket.emit('action-status', { action: 'start', status: 'starting' });

      // Use docker-compose up for the server
      const result = await servers.startServer(ctx.serverId);
      console.log('[Socket] Start result:', result);
      socket.emit('action-status', { action: 'start', ...result });

      if (result.success && ctx.containerName) {
        setTimeout(async () => {
          await connectLogStream(50);
          const status = await docker.getStatus(ctx.containerName!);
          socket.emit('status', status);

          // Send files status now that server is running
          if (status.running) {
            socket.emit('files', await files.checkServerFiles(ctx.containerName!));
            socket.emit('downloader-auth', await files.checkAuth(ctx.containerName!));
          }
        }, 2000);
      }
    });

    socket.on('check-files', async () => {
      if (!ctx.containerName) return;
      socket.emit('files', await files.checkServerFiles(ctx.containerName));
      socket.emit('downloader-auth', await files.checkAuth(ctx.containerName));
    });

    socket.on('logs:more', async ({ currentCount = 0, batchSize = 200 }: LogsMoreParams) => {
      if (!ctx.containerName) return;
      try {
        const total = currentCount + batchSize;
        const allLogs = await docker.getLogsHistory(total, ctx.containerName);

        const olderLogs = allLogs.slice(0, Math.max(0, allLogs.length - currentCount));

        socket.emit('logs:history', {
          logs: olderLogs,
          initial: false,
          hasMore: allLogs.length >= total
        });
      } catch (e) {
        socket.emit('logs:history', { logs: [], error: (e as Error).message });
      }
    });

    socket.on('wipe', async () => {
      if (!ctx.containerName) return;
      socket.emit('action-status', { action: 'wipe', status: 'starting' });
      const result = await files.wipeData(ctx.containerName);
      socket.emit('action-status', { action: 'wipe', ...result });
      socket.emit('downloader-auth', await files.checkAuth(ctx.containerName));
    });

    socket.on('files:list', async (dirPath = '/') => {
      if (!ctx.containerName) return;
      socket.emit('files:list-result', await files.listDirectory(dirPath, ctx.containerName));
    });

    socket.on('files:read', async (filePath: string) => {
      if (!ctx.containerName) return;
      socket.emit('files:read-result', await files.readContent(filePath, ctx.containerName));
    });

    socket.on('files:save', async ({ path: filePath, content, createBackup: shouldBackup }: SaveParams) => {
      if (!ctx.containerName) return;
      let backupResult = null;
      if (shouldBackup) {
        backupResult = await files.createBackup(filePath, ctx.containerName);
      }
      const result = await files.writeContent(filePath, content, ctx.containerName);
      socket.emit('files:save-result', { ...result, backup: backupResult });
    });

    socket.on('files:mkdir', async (dirPath: string) => {
      if (!ctx.containerName) return;
      socket.emit('files:mkdir-result', await files.createDirectory(dirPath, ctx.containerName));
    });

    socket.on('files:delete', async (itemPath: string) => {
      if (!ctx.containerName) return;
      socket.emit('files:delete-result', await files.deleteItem(itemPath, ctx.containerName));
    });

    socket.on('files:rename', async ({ oldPath, newPath }: RenameParams) => {
      if (!ctx.containerName) return;
      socket.emit('files:rename-result', await files.renameItem(oldPath, newPath, ctx.containerName));
    });

    socket.on('mods:list', async () => {
      if (!ctx.containerName) return;
      const result = await mods.listInstalledMods(ctx.containerName);

      if (result.success && modtale.isConfigured()) {
        const localMods = result.mods.filter((m) => m.isLocal && !m.projectId);

        if (localMods.length > 0) {
          const enrichPromises = localMods.map(async (mod) => {
            try {
              const searchTerm = mod.fileName
                .replace(/\.(jar|zip|disabled)$/gi, '')
                .replace(/-[\d.]+.*$/, '')
                .replace(/[-_]/g, ' ');

              if (!searchTerm || searchTerm.length < 2) return;

              const searchResult = await modtale.searchProjects({ query: searchTerm, pageSize: 5 });
              if (!searchResult.success || !searchResult.projects.length) return;

              const match = searchResult.projects.find(
                (p) =>
                  p.title.toLowerCase() === searchTerm.toLowerCase() ||
                  p.title.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (match) {
                const updates: Partial<mods.InstalledMod> = {
                  providerId: 'modtale',
                  projectId: match.id,
                  projectSlug: match.slug,
                  projectTitle: match.title,
                  projectIconUrl: match.iconUrl,
                  classification: match.classification,
                  isLocal: false
                };

                const versionMatch = mod.fileName.match(/-(\d+\.\d+(?:\.\d+)?)/);
                if (versionMatch) {
                  const fileVersion = versionMatch[1];
                  const matchingVersion = match.versions?.find((v) => v.version === fileVersion);
                  if (matchingVersion) {
                    updates.versionId = matchingVersion.id;
                    updates.versionName = matchingVersion.version;
                  } else {
                    updates.versionName = fileVersion;
                  }
                }

                Object.assign(mod, updates);
                await mods.updateMod(mod.id, updates, ctx.containerName!);
              }
            } catch (e) {
              console.error(`[Mods] Error enriching mod ${mod.fileName}:`, (e as Error).message);
            }
          });

          await Promise.all(enrichPromises);
        }
      }

      socket.emit('mods:list-result', result);
    });

    socket.on('mods:search', async (params: modtale.SearchParams) => {
      socket.emit('mods:search-result', await modtale.searchProjects(params));
    });

    socket.on('mods:get', async (projectId: string) => {
      socket.emit('mods:get-result', await modtale.getProject(projectId));
    });

    socket.on('mods:install', async ({ projectId, versionId, metadata }: InstallParams) => {
      if (!ctx.containerName) return;
      socket.emit('mods:install-status', { status: 'downloading', projectId });

      const downloadResult = await modtale.downloadVersion(projectId, metadata.versionName);
      if (!downloadResult.success || !downloadResult.buffer) {
        socket.emit('mods:install-result', { success: false, error: downloadResult.error });
        return;
      }

      socket.emit('mods:install-status', { status: 'installing', projectId });

      let fileName = downloadResult.fileName || metadata.fileName;
      if (!fileName) {
        const ext = metadata.classification === 'MODPACK' ? 'zip' : 'jar';
        fileName = `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.${ext}`;
      }

      const installResult = await mods.installMod(
        downloadResult.buffer,
        {
          ...metadata,
          projectId,
          versionId,
          fileName
        },
        ctx.containerName
      );

      socket.emit('mods:install-result', installResult);
    });

    socket.on('mods:uninstall', async (modId: string) => {
      if (!ctx.containerName) return;
      socket.emit('mods:uninstall-result', await mods.uninstallMod(modId, ctx.containerName));
    });

    socket.on('mods:enable', async (modId: string) => {
      if (!ctx.containerName) return;
      socket.emit('mods:enable-result', await mods.enableMod(modId, ctx.containerName));
    });

    socket.on('mods:disable', async (modId: string) => {
      if (!ctx.containerName) return;
      socket.emit('mods:disable-result', await mods.disableMod(modId, ctx.containerName));
    });

    socket.on('mods:check-config', async () => {
      socket.emit('mods:config-status', {
        configured: modtale.isConfigured()
      });
    });

    socket.on('mods:classifications', async () => {
      socket.emit('mods:classifications-result', await modtale.getClassifications());
    });

    socket.on('mods:check-updates', async () => {
      if (!ctx.containerName) return;
      try {
        const listResult = await mods.listInstalledMods(ctx.containerName);
        if (!listResult.success) {
          socket.emit('mods:check-updates-result', { success: false, error: listResult.error });
          return;
        }

        const modtaleMods = listResult.mods.filter((m) => m.providerId === 'modtale' && m.projectId);

        const updateChecks = await Promise.all(
          modtaleMods.map(async (mod) => {
            try {
              const projectResult = await modtale.getProject(mod.projectId!);
              if (projectResult.success && projectResult.project?.latestVersion) {
                const latest = projectResult.project.latestVersion;
                if (latest.id && latest.id !== mod.versionId) {
                  return {
                    modId: mod.id,
                    projectId: mod.projectId,
                    projectTitle: mod.projectTitle,
                    currentVersion: mod.versionName,
                    latestVersion: latest.version,
                    latestVersionId: latest.id,
                    latestFileName: latest.fileName
                  };
                }
              }
            } catch (e) {
              console.error(`[Mods] Error checking updates for ${mod.projectTitle}:`, (e as Error).message);
            }
            return null;
          })
        );

        const updates = updateChecks.filter(Boolean);
        socket.emit('mods:check-updates-result', { success: true, updates });
      } catch (e) {
        socket.emit('mods:check-updates-result', { success: false, error: (e as Error).message });
      }
    });

    socket.on('mods:update', async ({ modId, versionId, metadata }: UpdateParams) => {
      if (!ctx.containerName) return;
      console.log(`[Mods] Update request: modId=${modId}, versionId=${versionId}`);

      const modResult = await mods.getMod(modId, ctx.containerName);
      if (!modResult.success || !modResult.mod) {
        socket.emit('mods:update-result', { success: false, error: 'Mod not found' });
        return;
      }

      const mod = modResult.mod;
      socket.emit('mods:update-status', { status: 'downloading', modId });

      const downloadResult = await modtale.downloadVersion(mod.projectId!, metadata.versionName);
      if (!downloadResult.success || !downloadResult.buffer) {
        socket.emit('mods:update-result', { success: false, error: downloadResult.error });
        return;
      }

      socket.emit('mods:update-status', { status: 'installing', modId });

      const installResult = await mods.installMod(
        downloadResult.buffer,
        {
          providerId: mod.providerId,
          projectId: mod.projectId || undefined,
          projectSlug: mod.projectSlug,
          projectTitle: mod.projectTitle,
          projectIconUrl: mod.projectIconUrl,
          versionId: versionId,
          versionName: metadata.versionName,
          classification: mod.classification,
          fileName: downloadResult.fileName || metadata.fileName
        },
        ctx.containerName
      );

      if (installResult.success) {
        socket.emit('mods:update-result', { success: true, mod: installResult.mod });
      } else {
        socket.emit('mods:update-result', { success: false, error: installResult.error });
      }
    });

    // Status interval - only when joined to a server
    const statusInterval = setInterval(async () => {
      if (ctx.containerName) {
        socket.emit('status', await docker.getStatus(ctx.containerName));
      }
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(statusInterval);
      if (logStream) {
        try {
          (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        } catch {
          /* ignore */
        }
      }
      console.log('Client disconnected');
    });
  });
}
