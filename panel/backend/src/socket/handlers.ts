import type { Server, Socket } from 'socket.io';
import * as docker from '../services/docker.js';
import * as downloader from '../services/downloader.js';
import * as files from '../services/files.js';
import * as mods from '../services/mods.js';
import * as modtale from '../services/modtale.js';

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

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected');

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

      try {
        logStream = await docker.getLogs({ tail });

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

    // Register ALL handlers first (before any async operations)
    socket.on('command', async (cmd: string) => {
      const result = await docker.sendCommand(cmd);
      socket.emit('command-result', { cmd, ...result });
    });

    socket.on('download', async () => {
      await downloader.downloadServerFiles(socket);
    });

    socket.on('restart', async () => {
      socket.emit('action-status', { action: 'restart', status: 'starting' });
      const result = await docker.restart();
      socket.emit('action-status', { action: 'restart', ...result });

      if (result.success) {
        setTimeout(async () => {
          await connectLogStream(50);
          socket.emit('status', await docker.getStatus());
        }, 2000);
      }
    });

    socket.on('stop', async () => {
      console.log('[Socket] Stop requested');
      socket.emit('action-status', { action: 'stop', status: 'starting' });
      const result = await docker.stop();
      console.log('[Socket] Stop result:', result);
      socket.emit('action-status', { action: 'stop', ...result });
    });

    socket.on('start', async () => {
      console.log('[Socket] Start requested');
      socket.emit('action-status', { action: 'start', status: 'starting' });
      const result = await docker.start();
      console.log('[Socket] Start result:', result);
      socket.emit('action-status', { action: 'start', ...result });

      if (result.success) {
        setTimeout(async () => {
          await connectLogStream(50);
          socket.emit('status', await docker.getStatus());
        }, 2000);
      }
    });

    socket.on('check-files', async () => {
      socket.emit('files', await files.checkServerFiles());
      socket.emit('downloader-auth', await files.checkAuth());
    });

    socket.on('logs:more', async ({ currentCount = 0, batchSize = 200 }: LogsMoreParams) => {
      try {
        const total = currentCount + batchSize;
        const allLogs = await docker.getLogsHistory(total);

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
      socket.emit('action-status', { action: 'wipe', status: 'starting' });
      const result = await files.wipeData();
      socket.emit('action-status', { action: 'wipe', ...result });
      socket.emit('downloader-auth', await files.checkAuth());
    });

    socket.on('files:list', async (dirPath = '/') => {
      socket.emit('files:list-result', await files.listDirectory(dirPath));
    });

    socket.on('files:read', async (filePath: string) => {
      socket.emit('files:read-result', await files.readContent(filePath));
    });

    socket.on('files:save', async ({ path: filePath, content, createBackup: shouldBackup }: SaveParams) => {
      let backupResult = null;
      if (shouldBackup) {
        backupResult = await files.createBackup(filePath);
      }
      const result = await files.writeContent(filePath, content);
      socket.emit('files:save-result', { ...result, backup: backupResult });
    });

    socket.on('files:mkdir', async (dirPath: string) => {
      socket.emit('files:mkdir-result', await files.createDirectory(dirPath));
    });

    socket.on('files:delete', async (itemPath: string) => {
      socket.emit('files:delete-result', await files.deleteItem(itemPath));
    });

    socket.on('files:rename', async ({ oldPath, newPath }: RenameParams) => {
      socket.emit('files:rename-result', await files.renameItem(oldPath, newPath));
    });

    socket.on('mods:list', async () => {
      const result = await mods.listInstalledMods();

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
                await mods.updateMod(mod.id, updates);
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

      const installResult = await mods.installMod(downloadResult.buffer, {
        ...metadata,
        projectId,
        versionId,
        fileName
      });

      socket.emit('mods:install-result', installResult);
    });

    socket.on('mods:uninstall', async (modId: string) => {
      socket.emit('mods:uninstall-result', await mods.uninstallMod(modId));
    });

    socket.on('mods:enable', async (modId: string) => {
      socket.emit('mods:enable-result', await mods.enableMod(modId));
    });

    socket.on('mods:disable', async (modId: string) => {
      socket.emit('mods:disable-result', await mods.disableMod(modId));
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
      try {
        const listResult = await mods.listInstalledMods();
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
      console.log(`[Mods] Update request: modId=${modId}, versionId=${versionId}`);

      const modResult = await mods.getMod(modId);
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

      const installResult = await mods.installMod(downloadResult.buffer, {
        providerId: mod.providerId,
        projectId: mod.projectId || undefined,
        projectSlug: mod.projectSlug,
        projectTitle: mod.projectTitle,
        projectIconUrl: mod.projectIconUrl,
        versionId: versionId,
        versionName: metadata.versionName,
        classification: mod.classification,
        fileName: downloadResult.fileName || metadata.fileName
      });

      if (installResult.success) {
        socket.emit('mods:update-result', { success: true, mod: installResult.mod });
      } else {
        socket.emit('mods:update-result', { success: false, error: installResult.error });
      }
    });

    const statusInterval = setInterval(async () => {
      socket.emit('status', await docker.getStatus());
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

    // Send initial data AFTER all handlers are registered
    (async () => {
      socket.emit('status', await docker.getStatus());
      socket.emit('files', await files.checkServerFiles());
      socket.emit('downloader-auth', await files.checkAuth());

      try {
        const history = await docker.getLogsHistory(500);
        socket.emit('logs:history', { logs: history, initial: true });
      } catch (e) {
        console.error('Failed to get log history:', (e as Error).message);
      }

      await connectLogStream();
    })();
  });
}
