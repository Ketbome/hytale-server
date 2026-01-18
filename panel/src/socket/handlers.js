const docker = require("../services/docker");
const files = require("../services/files");
const downloader = require("../services/downloader");
const mods = require("../services/mods");
const modtale = require("../services/modtale");

function setupSocketHandlers(io) {
  io.on("connection", async socket => {
    console.log("Client connected");

    // Initial state
    socket.emit("status", await docker.getStatus());
    socket.emit("files", await files.checkServerFiles());
    socket.emit("downloader-auth", await files.checkAuth());

    // Send initial log history
    try {
      const history = await docker.getLogsHistory(500);
      socket.emit("logs:history", { logs: history, initial: true });
    } catch (e) {
      console.error("Failed to get log history:", e.message);
    }

    // Log streaming
    let logStream = null;

    async function connectLogStream(tail = 0) {
      if (logStream) {
        try { logStream.destroy(); } catch (e) { /* ignore */ }
        logStream = null;
      }

      try {
        logStream = await docker.getLogs({ tail });

        logStream.on("data", chunk => {
          socket.emit("log", chunk.slice(8).toString("utf8"));
        });

        logStream.on("error", () => { logStream = null; });
        logStream.on("end", () => { logStream = null; });
      } catch (e) {
        socket.emit("error", "Failed to connect to container logs: " + e.message);
      }
    }

    await connectLogStream();

    // Command handlers
    socket.on("command", async cmd => {
      const result = await docker.sendCommand(cmd);
      socket.emit("command-result", { cmd, ...result });
    });

    socket.on("download", async () => {
      await downloader.downloadServerFiles(socket);
    });

    socket.on("restart", async () => {
      socket.emit("action-status", { action: "restart", status: "starting" });
      const result = await docker.restart();
      socket.emit("action-status", { action: "restart", ...result });

      if (result.success) {
        setTimeout(async () => {
          await connectLogStream(50);
          socket.emit("status", await docker.getStatus());
        }, 2000);
      }
    });

    socket.on("stop", async () => {
      socket.emit("action-status", { action: "stop", status: "starting" });
      const result = await docker.stop();
      socket.emit("action-status", { action: "stop", ...result });
    });

    socket.on("start", async () => {
      socket.emit("action-status", { action: "start", status: "starting" });
      const result = await docker.start();
      socket.emit("action-status", { action: "start", ...result });

      if (result.success) {
        setTimeout(async () => {
          await connectLogStream(50);
          socket.emit("status", await docker.getStatus());
        }, 2000);
      }
    });

    socket.on("check-files", async () => {
      socket.emit("files", await files.checkServerFiles());
      socket.emit("downloader-auth", await files.checkAuth());
    });

    // Request more log history using offset-based pagination
    socket.on("logs:more", async ({ currentCount = 0, batchSize = 200 }) => {
      try {
        // Request more logs than client has, then slice the older portion
        const total = currentCount + batchSize;
        const allLogs = await docker.getLogsHistory(total);
        
        // If we got fewer logs than requested total, we've reached the end
        // Return only the older logs (ones the client doesn't have yet)
        const olderLogs = allLogs.slice(0, Math.max(0, allLogs.length - currentCount));
        
        socket.emit("logs:history", { 
          logs: olderLogs, 
          initial: false,
          hasMore: allLogs.length >= total
        });
      } catch (e) {
        socket.emit("logs:history", { logs: [], error: e.message });
      }
    });

    socket.on("wipe", async () => {
      socket.emit("action-status", { action: "wipe", status: "starting" });
      const result = await files.wipeData();
      socket.emit("action-status", { action: "wipe", ...result });
      socket.emit("downloader-auth", await files.checkAuth());
    });

    // File manager handlers
    socket.on("files:list", async (dirPath = "/") => {
      socket.emit("files:list-result", await files.listDirectory(dirPath));
    });

    socket.on("files:read", async filePath => {
      socket.emit("files:read-result", await files.readContent(filePath));
    });

    socket.on("files:save", async ({ path: filePath, content, createBackup: shouldBackup }) => {
      let backupResult = null;
      if (shouldBackup) {
        backupResult = await files.createBackup(filePath);
      }
      const result = await files.writeContent(filePath, content);
      socket.emit("files:save-result", { ...result, backup: backupResult });
    });

    socket.on("files:mkdir", async dirPath => {
      socket.emit("files:mkdir-result", await files.createDirectory(dirPath));
    });

    socket.on("files:delete", async itemPath => {
      socket.emit("files:delete-result", await files.deleteItem(itemPath));
    });

    socket.on("files:rename", async ({ oldPath, newPath }) => {
      socket.emit("files:rename-result", await files.renameItem(oldPath, newPath));
    });

    // Mods handlers
    socket.on("mods:list", async () => {
      const result = await mods.listInstalledMods();

      // Try to enrich local mods with Modtale API data
      if (result.success && modtale.isConfigured()) {
        const localMods = result.mods.filter(m => m.isLocal && !m.projectId);

        if (localMods.length > 0) {
          const enrichPromises = localMods.map(async (mod) => {
            try {
              // Extract search term from filename (e.g., "OrbisGuard" from "OrbisGuard-0.4.0.jar")
              const searchTerm = mod.fileName
                .replace(/\.(jar|zip|disabled)$/gi, "")
                .replace(/-[\d.]+.*$/, "") // Remove version suffix
                .replace(/[-_]/g, " ");

              if (!searchTerm || searchTerm.length < 2) return;

              const searchResult = await modtale.searchProjects({ query: searchTerm, pageSize: 5 });
              if (!searchResult.success || !searchResult.projects.length) return;

              // Find best match (case-insensitive title match)
              const match = searchResult.projects.find(p =>
                p.title.toLowerCase() === searchTerm.toLowerCase() ||
                p.title.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (match) {
                // Prepare updates
                const updates = {
                  providerId: "modtale",
                  projectId: match.id,
                  projectSlug: match.slug,
                  projectTitle: match.title,
                  projectIconUrl: match.iconUrl,
                  classification: match.classification,
                  isLocal: false
                };

                // Try to match version
                const versionMatch = mod.fileName.match(/-(\d+\.\d+(?:\.\d+)?)/);
                if (versionMatch) {
                  const fileVersion = versionMatch[1];
                  const matchingVersion = match.versions?.find(v => v.version === fileVersion);
                  if (matchingVersion) {
                    updates.versionId = matchingVersion.id;
                    updates.versionName = matchingVersion.version;
                  } else {
                    updates.versionName = fileVersion;
                  }
                }

                // Apply updates to current mod object
                Object.assign(mod, updates);

                // Save to storage
                await mods.updateMod(mod.id, updates);
              }
            } catch (e) {
              console.error(`[Mods] Error enriching mod ${mod.fileName}:`, e.message);
            }
          });

          await Promise.all(enrichPromises);
        }
      }

      socket.emit("mods:list-result", result);
    });

    socket.on("mods:search", async (params) => {
      socket.emit("mods:search-result", await modtale.searchProjects(params));
    });

    socket.on("mods:get", async (projectId) => {
      socket.emit("mods:get-result", await modtale.getProject(projectId));
    });

    socket.on("mods:install", async ({ projectId, versionId, metadata }) => {
      socket.emit("mods:install-status", { status: "downloading", projectId });

      // Download mod from Modtale (uses versionName as version number in URL)
      const downloadResult = await modtale.downloadVersion(projectId, metadata.versionName);
      if (!downloadResult.success) {
        socket.emit("mods:install-result", { success: false, error: downloadResult.error });
        return;
      }

      socket.emit("mods:install-status", { status: "installing", projectId });

      // Get filename from response header or generate from metadata
      let fileName = downloadResult.fileName || metadata.fileName;
      if (!fileName) {
        const ext = metadata.classification === "MODPACK" ? "zip" : "jar";
        fileName = `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, "-")}-${metadata.versionName}.${ext}`;
      }

      // Install mod
      const installResult = await mods.installMod(downloadResult.buffer, {
        ...metadata,
        projectId,
        versionId,
        fileName
      });

      socket.emit("mods:install-result", installResult);
    });

    socket.on("mods:uninstall", async (modId) => {
      socket.emit("mods:uninstall-result", await mods.uninstallMod(modId));
    });

    socket.on("mods:enable", async (modId) => {
      socket.emit("mods:enable-result", await mods.enableMod(modId));
    });

    socket.on("mods:disable", async (modId) => {
      socket.emit("mods:disable-result", await mods.disableMod(modId));
    });

    socket.on("mods:check-config", async () => {
      // API key is only from MODTALE_API_KEY env var
      socket.emit("mods:config-status", {
        configured: modtale.isConfigured()
      });
    });

    socket.on("mods:classifications", async () => {
      socket.emit("mods:classifications-result", await modtale.getClassifications());
    });

    socket.on("mods:check-updates", async () => {
      try {
        // Get installed mods
        const listResult = await mods.listInstalledMods();
        if (!listResult.success) {
          socket.emit("mods:check-updates-result", { success: false, error: listResult.error });
          return;
        }

        // Filter only mods from modtale (not local mods)
        const modtaleMods = listResult.mods.filter(m => m.providerId === "modtale" && m.projectId);

        // Check all mods for updates in parallel
        const updateChecks = await Promise.all(
          modtaleMods.map(async mod => {
            try {
              const projectResult = await modtale.getProject(mod.projectId);
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
              console.error(`[Mods] Error checking updates for ${mod.projectTitle}:`, e.message);
            }
            return null;
          })
        );

        const updates = updateChecks.filter(Boolean);
        socket.emit("mods:check-updates-result", { success: true, updates });
      } catch (e) {
        socket.emit("mods:check-updates-result", { success: false, error: e.message });
      }
    });

    socket.on("mods:update", async ({ modId, versionId, metadata }) => {
      console.log(`[Mods] Update request: modId=${modId}, versionId=${versionId}`);

      // Get current mod info
      const modResult = await mods.getMod(modId);
      if (!modResult.success || !modResult.mod) {
        socket.emit("mods:update-result", { success: false, error: "Mod not found" });
        return;
      }

      const mod = modResult.mod;
      socket.emit("mods:update-status", { status: "downloading", modId });

      // Download new version (uses versionName as version number in URL)
      const downloadResult = await modtale.downloadVersion(mod.projectId, metadata.versionName);
      if (!downloadResult.success) {
        socket.emit("mods:update-result", { success: false, error: downloadResult.error });
        return;
      }

      socket.emit("mods:update-status", { status: "installing", modId });

      // Install new version (this will replace the old file)
      const installResult = await mods.installMod(downloadResult.buffer, {
        providerId: mod.providerId,
        projectId: mod.projectId,
        projectSlug: mod.projectSlug,
        projectTitle: mod.projectTitle,
        projectIconUrl: mod.projectIconUrl,
        versionId: versionId,
        versionName: metadata.versionName,
        classification: mod.classification,
        fileName: downloadResult.fileName || metadata.fileName
      });

      if (installResult.success) {
        socket.emit("mods:update-result", { success: true, mod: installResult.mod });
      } else {
        socket.emit("mods:update-result", { success: false, error: installResult.error });
      }
    });

    // Status polling
    const statusInterval = setInterval(async () => {
      socket.emit("status", await docker.getStatus());
    }, 5000);

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      clearInterval(statusInterval);
      if (logStream) {
        try { logStream.destroy(); } catch (e) { /* ignore */ }
      }
      console.log("Client disconnected");
    });
  });
}

module.exports = { setupSocketHandlers };
