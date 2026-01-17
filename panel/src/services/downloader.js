const docker = require("./docker");
const files = require("./files");

async function downloadServerFiles(socket) {
  try {
    const c = await docker.getContainer();
    if (!c) throw new Error("Container not found");

    socket.emit("download-status", {
      status: "starting",
      message: "Starting download..."
    });

    await docker.execCommand("rm -f /opt/hytale/.download_attempted");

    console.log("Starting hytale-downloader with streaming");

    const exec = await c.exec({
      Cmd: [
        "sh", "-c",
        "cd /opt/hytale && hytale-downloader -download-path /tmp/hytale-game.zip 2>&1"
      ],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await exec.start({ Tty: true });

    stream.on("data", chunk => {
      const text = chunk.toString("utf8");
      console.log("Download output:", text);

      if (
        text.includes("oauth.accounts.hytale.com") ||
        text.includes("user_code") ||
        text.includes("Authorization code")
      ) {
        socket.emit("download-status", { status: "auth-required", message: text });
      } else if (text.includes("403") || text.includes("Forbidden")) {
        socket.emit("download-status", {
          status: "error",
          message: "Authentication failed or expired. Try again."
        });
      } else {
        socket.emit("download-status", { status: "output", message: text });
      }
    });

    stream.on("end", async () => {
      console.log("Download stream ended");

      const checkZip = await docker.execCommand(
        "ls /tmp/hytale-game.zip 2>/dev/null || echo 'NO_ZIP'"
      );

      if (!checkZip.includes("NO_ZIP")) {
        socket.emit("download-status", {
          status: "extracting",
          message: "Extracting files..."
        });

        await docker.execCommand(
          "unzip -o /tmp/hytale-game.zip -d /tmp/hytale-extract 2>/dev/null || true"
        );
        await docker.execCommand(
          "find /tmp/hytale-extract -name 'HytaleServer.jar' -exec cp {} /opt/hytale/ \\; 2>/dev/null || true"
        );
        await docker.execCommand(
          "find /tmp/hytale-extract -name 'Assets.zip' -exec cp {} /opt/hytale/ \\; 2>/dev/null || true"
        );
        await docker.execCommand("rm -rf /tmp/hytale-game.zip /tmp/hytale-extract");

        socket.emit("download-status", {
          status: "complete",
          message: "Download complete!"
        });
      } else {
        socket.emit("download-status", {
          status: "done",
          message: "Download finished. Check if authentication was completed."
        });
      }

      socket.emit("files", await files.checkServerFiles());
      socket.emit("downloader-auth", await files.checkAuth());
    });

    stream.on("error", err => {
      console.error("Download stream error:", err);
      socket.emit("download-status", { status: "error", message: err.message });
    });
  } catch (e) {
    console.error("Download error:", e);
    socket.emit("download-status", { status: "error", message: e.message });
  }
}

module.exports = { downloadServerFiles };
