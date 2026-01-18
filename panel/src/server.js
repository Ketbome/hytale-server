const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cookieParser = require("cookie-parser");

const config = require("./config");
const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const { socketAuth } = require("./middleware/auth");
const { setupSocketHandlers } = require("./socket/handlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Auth routes (public)
app.use("/auth", authRoutes);

// Protected API routes
app.use("/api", apiRoutes);

// Socket.IO auth middleware
io.use(socketAuth);

// Socket.IO handlers
setupSocketHandlers(io);

// Warn about default credentials
if (config.auth.username === "admin" && config.auth.password === "admin") {
  console.warn("\n⚠️  WARNING: Using default credentials!");
  console.warn("   Set PANEL_USER and PANEL_PASS environment variables.\n");
}

// Start server
server.listen(config.server.port, () => {
  console.log(`Hytale Panel running on http://localhost:${config.server.port}`);
});
