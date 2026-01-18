const path = require("path");
const tar = require("tar-stream");
const config = require("../config");
const docker = require("./docker");

const { basePath, editableExtensions, uploadAllowedExtensions } = config.files;

// Security: prevent path traversal
function sanitizePath(requestedPath) {
  // Reject any path containing ..
  if (requestedPath.includes('..')) {
    throw new Error("Path traversal attempt detected");
  }
  const normalized = path.normalize(requestedPath);
  const fullPath = path.join(basePath, normalized);
  if (!fullPath.startsWith(basePath)) {
    throw new Error("Path traversal attempt detected");
  }
  return fullPath;
}

function getRelativePath(fullPath) {
  return fullPath.replace(basePath, "") || "/";
}

function isAllowedUpload(filename) {
  const ext = path.extname(filename).toLowerCase();
  return uploadAllowedExtensions.includes(ext);
}

function isEditable(filename) {
  const ext = path.extname(filename).toLowerCase();
  return editableExtensions.includes(ext);
}

function getFileIcon(filename, isDirectory) {
  if (isDirectory) return "folder";
  const ext = path.extname(filename).toLowerCase();
  const icons = {
    ".jar": "java", 
    ".zip": "archive", ".tar": "archive", ".gz": "archive", ".7z": "archive", ".rar": "archive",
    ".json": "json",
    ".yaml": "yaml", ".yml": "yaml", 
    ".properties": "config", ".cfg": "config", ".conf": "config", 
    ".xml": "config", ".toml": "config", ".ini": "config",
    ".txt": "text", ".md": "text",
    ".log": "log",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".webp": "image",
    ".lua": "script", ".js": "script", ".sh": "script", ".bat": "script",
    ".dat": "data", ".nbt": "data", ".mca": "data", ".mcr": "data", ".db": "data", ".ldb": "data",
    ".ogg": "audio", ".mp3": "audio", ".wav": "audio"
  };
  return icons[ext] || "file";
}

async function listDirectory(dirPath) {
  try {
    const safePath = sanitizePath(dirPath);
    const result = await docker.execCommand(
      `ls -la "${safePath}" 2>/dev/null | tail -n +2`,
      10000
    );

    const files = [];
    const lines = result.trim().split("\n").filter(l => l.trim());

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        const permissions = parts[0];
        const size = parseInt(parts[4], 10);
        const name = parts.slice(8).join(" ");

        if (name === "." || name === "..") continue;

        const isDir = permissions.startsWith("d");
        files.push({
          name,
          isDirectory: isDir,
          size: isDir ? null : size,
          permissions,
          icon: getFileIcon(name, isDir),
          editable: !isDir && isEditable(name)
        });
      }
    }

    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, files, path: dirPath };
  } catch (e) {
    return { success: false, error: e.message, files: [], path: dirPath };
  }
}

async function createDirectory(dirPath) {
  try {
    const safePath = sanitizePath(dirPath);
    await docker.execCommand(`mkdir -p "${safePath}"`, 5000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function deleteItem(itemPath) {
  try {
    const safePath = sanitizePath(itemPath);
    if (safePath === basePath) {
      throw new Error("Cannot delete root directory");
    }
    await docker.execCommand(`rm -rf "${safePath}"`, 10000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function renameItem(oldPath, newPath) {
  try {
    const safeOld = sanitizePath(oldPath);
    const safeNew = sanitizePath(newPath);
    await docker.execCommand(`mv "${safeOld}" "${safeNew}"`, 5000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function createBackup(filePath) {
  try {
    const safePath = sanitizePath(filePath);
    const backupPath = `${safePath}.backup.${Date.now()}`;
    await docker.execCommand(`cp "${safePath}" "${backupPath}"`, 5000);
    return { success: true, backupPath: getRelativePath(backupPath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function readContent(filePath) {
  try {
    const safePath = sanitizePath(filePath);

    if (!isEditable(safePath)) {
      return { success: false, error: "File type not editable", binary: true };
    }

    const stream = await docker.getArchive(safePath);

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let content = "";

      extract.on("entry", (header, entryStream, next) => {
        const chunks = [];
        entryStream.on("data", chunk => chunks.push(chunk));
        entryStream.on("end", () => {
          content = Buffer.concat(chunks).toString("utf8");
          next();
        });
        entryStream.resume();
      });

      extract.on("finish", () => {
        resolve({ success: true, content, path: filePath });
      });

      extract.on("error", reject);
      stream.pipe(extract);
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function writeContent(filePath, content) {
  try {
    const safePath = sanitizePath(filePath);
    const pack = tar.pack();
    const fileName = path.basename(safePath);
    const dirPath = path.dirname(safePath);

    pack.entry({ name: fileName }, content);
    pack.finalize();

    await docker.putArchive(pack, { path: dirPath });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function upload(targetDir, fileName, fileBuffer) {
  try {
    const safeDirPath = sanitizePath(targetDir);

    if (!isAllowedUpload(fileName)) {
      throw new Error("File type not allowed: " + path.extname(fileName));
    }

    const pack = tar.pack();
    pack.entry({ name: fileName }, fileBuffer);
    pack.finalize();

    await docker.putArchive(pack, { path: safeDirPath });
    return { success: true, fileName };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function download(filePath) {
  try {
    const safePath = sanitizePath(filePath);
    const stream = await docker.getArchive(safePath);
    return { success: true, stream, fileName: path.basename(safePath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function checkServerFiles() {
  try {
    const result = await docker.execCommand(
      'ls -la /opt/hytale/*.jar /opt/hytale/*.zip 2>/dev/null || echo "NO_FILES"'
    );
    const hasJar = result.includes("HytaleServer.jar");
    const hasAssets = result.includes("Assets.zip");
    return { hasJar, hasAssets, ready: hasJar && hasAssets };
  } catch (e) {
    return { hasJar: false, hasAssets: false, ready: false };
  }
}

async function checkAuth() {
  try {
    const result = await docker.execCommand(
      'cat /opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || echo "NO_AUTH"'
    );
    return !result.includes("NO_AUTH") && result.includes("access_token");
  } catch (e) {
    return false;
  }
}

async function wipeData() {
  try {
    await docker.execCommand(
      "rm -rf /opt/hytale/universe/* /opt/hytale/logs/* /opt/hytale/config/* " +
      "/opt/hytale/.cache/* /opt/hytale/.download_attempted " +
      "/opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || true"
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  sanitizePath,
  getRelativePath,
  isAllowedUpload,
  isEditable,
  getFileIcon,
  listDirectory,
  createDirectory,
  deleteItem,
  renameItem,
  createBackup,
  readContent,
  writeContent,
  upload,
  download,
  checkServerFiles,
  checkAuth,
  wipeData
};
