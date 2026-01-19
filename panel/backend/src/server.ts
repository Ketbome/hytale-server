import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import { Server } from 'socket.io';

import config from './config/index.js';
import { socketAuth } from './middleware/auth.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import { setupSocketHandlers } from './socket/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(cookieParser());

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../public-dist')));
}

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

io.use(socketAuth);
setupSocketHandlers(io);

if (config.auth.username === 'admin' && config.auth.password === 'admin') {
  console.warn('\n⚠️  WARNING: Using default credentials!');
  console.warn('   Set PANEL_USER and PANEL_PASS environment variables.\n');
}

server.listen(config.server.port, () => {
  console.log(`Hytale Panel backend running on port ${config.server.port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Dev mode: access via http://localhost:5173');
  } else {
    console.log(`Production: http://localhost:${config.server.port}`);
  }
});
