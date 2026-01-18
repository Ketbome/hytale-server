const docker = require("../services/docker");
const files = require("../services/files");
const downloader = require("../services/downloader");

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
