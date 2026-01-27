import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import config from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import * as docker from '../services/docker.js';
import * as files from '../services/files.js';
import * as servers from '../services/servers.js';

const router: RouterType = Router();

router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.files.maxUploadSize }
});

// ==================== SERVERS API ====================

router.get('/servers', async (_req, res) => {
  try {
    const result = await servers.listServers();

    if (result.success && result.servers) {
      // Enrich with container status
      const enriched = await Promise.all(
        result.servers.map(async (server) => {
          const status = await docker.getStatus(server.containerName);
          return { ...server, status: status.running ? 'running' : 'stopped' };
        })
      );
      res.json({ success: true, servers: enriched });
    } else {
      res.json(result);
    }
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers', async (req, res) => {
  try {
    const {
      name,
      port,
      config: serverConfig
    } = req.body as {
      name: string;
      port?: number;
      config?: Partial<servers.ServerConfig>;
    };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    const result = await servers.createServer({ name: name.trim(), port, config: serverConfig });
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get('/servers/:id', async (req, res) => {
  try {
    const result = await servers.getServer(req.params.id);

    if (result.success && result.server) {
      const status = await docker.getStatus(result.server.containerName);
      res.json({
        success: true,
        server: { ...result.server, status: status.running ? 'running' : 'stopped' }
      });
    } else {
      res.status(404).json(result);
    }
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.put('/servers/:id', async (req, res) => {
  try {
    const {
      name,
      port,
      config: serverConfig
    } = req.body as {
      name?: string;
      port?: number;
      config?: Partial<servers.ServerConfig>;
    };

    const result = await servers.updateServer(req.params.id, { name, port, config: serverConfig });

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.delete('/servers/:id', async (req, res) => {
  try {
    const result = await servers.deleteServer(req.params.id, true);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/start', async (req, res) => {
  try {
    const result = await servers.startServer(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/stop', async (req, res) => {
  try {
    const result = await servers.stopServer(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/restart', async (req, res) => {
  try {
    const result = await servers.restartServer(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// Docker Compose management
router.get('/servers/:id/compose', async (req, res) => {
  try {
    const result = await servers.getServerCompose(req.params.id);
    if (!result.success) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.put('/servers/:id/compose', async (req, res) => {
  try {
    const { content } = req.body as { content: string };
    if (!content) {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }
    const result = await servers.saveServerCompose(req.params.id, content);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/compose/regenerate', async (req, res) => {
  try {
    const result = await servers.regenerateServerCompose(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ==================== FILES API ====================

router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    const { targetDir, containerName } = req.body as { targetDir?: string; containerName: string };
    const file = req.file;

    if (!containerName) {
      res.status(400).json({ success: false, error: 'Container name is missing' });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    if (file.size > config.files.maxUploadSize) {
      res.status(413).json({ success: false, error: 'File too large (max 100MB)' });
      return;
    }

    const result = await files.upload(targetDir || '/', file.originalname, file.buffer, containerName);

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get('/files/download', async (req, res) => {
  try {
    const { path: filePath } = req.query as { path?: string };

    if (!filePath) {
      res.status(400).json({ success: false, error: 'Path required' });
      return;
    }

    const result = await files.download(filePath);

    if (!result.success || !result.stream) {
      res.status(404).json(result);
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}.tar"`);
    res.setHeader('Content-Type', 'application/x-tar');

    result.stream.pipe(res);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

export default router;
