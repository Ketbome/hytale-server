const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const config = require("./config");
const apiRoutes = require("./routes/api");
const { setupSocketHandlers } = require("./socket/handlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api", apiRoutes);

// Socket.IO handlers
setupSocketHandlers(io);

// Start server
server.listen(config.server.port, () => {
  console.log(`Hytale Panel running on http://localhost:${config.server.port}`);
});
