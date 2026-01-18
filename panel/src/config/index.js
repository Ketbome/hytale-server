const crypto = require("crypto");

// Generate random secret if not provided (persists for container lifetime)
const defaultSecret = crypto.randomBytes(32).toString("hex");

module.exports = {
  container: {
    name: process.env.CONTAINER_NAME || "hytale-server"
  },
  server: {
    port: parseInt(process.env.PANEL_PORT, 10) || 3000
  },
  docker: {
    socketPath: "/var/run/docker.sock"
  },
  auth: {
    // Set these via environment variables!
    username: process.env.PANEL_USER || "admin",
    password: process.env.PANEL_PASS || "admin",
    jwtSecret: process.env.JWT_SECRET || defaultSecret,
    tokenExpiry: "24h"
  },
  files: {
    basePath: "/opt/hytale",
    maxUploadSize: 500 * 1024 * 1024, // 500MB for world folders
    editableExtensions: [
      ".json", ".yaml", ".yml", ".properties", 
      ".txt", ".cfg", ".conf", ".xml", ".toml", ".ini",
      ".lua", ".js", ".sh", ".bat", ".md", ".log"
    ],
    uploadAllowedExtensions: [
      // Archives (worlds, backups)
      ".jar", ".zip", ".tar", ".gz", ".7z", ".rar",
      // Config files
      ".json", ".yaml", ".yml", ".properties", ".txt", 
      ".cfg", ".conf", ".xml", ".toml", ".ini",
      // Scripts
      ".lua", ".js", ".sh", ".bat",
      // World data (Minecraft-style)
      ".dat", ".nbt", ".mca", ".mcr", ".db", ".ldb",
      // Media
      ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ogg", ".mp3", ".wav",
      // Docs
      ".md", ".log", ".csv"
    ]
  }
};
