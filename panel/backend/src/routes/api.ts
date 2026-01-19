import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import config from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import * as files from '../services/files.js';

const router: RouterType = Router();

router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.files.maxUploadSize }
});

router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    const { targetDir } = req.body as { targetDir?: string };
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    if (file.size > config.files.maxUploadSize) {
      res.status(413).json({ success: false, error: 'File too large (max 100MB)' });
      return;
    }

    const result = await files.upload(targetDir || '/', file.originalname, file.buffer);

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
