import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Readable } from 'node:stream';

interface UploadResult {
  success: boolean;
  fileName?: string;
}

interface DownloadResult {
  success: boolean;
  fileName?: string;
  stream?: Readable;
}

const mockUpload = jest.fn<(dir: string, name: string, data: Buffer, containerName: string) => Promise<UploadResult>>();
const mockDownload = jest.fn<(path: string) => Promise<DownloadResult>>();

jest.unstable_mockModule('../src/services/files.js', () => ({
  upload: mockUpload,
  download: mockDownload
}));

const express = (await import('express')).default;
const request = (await import('supertest')).default;
const cookieParser = (await import('cookie-parser')).default;
const { generateToken } = await import('../src/middleware/auth.js');
const apiRoutes = (await import('../src/routes/api.js')).default;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  const validToken = generateToken('admin');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication required', () => {
    test('returns 401 without token', async () => {
      expect((await request(app).post('/api/files/upload')).status).toBe(401);
      expect((await request(app).get('/api/files/download')).status).toBe(401);
    });
  });

  describe('POST /api/files/upload', () => {
    test('returns 400 without file', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    test('uploads file successfully', async () => {
      mockUpload.mockResolvedValue({ success: true, fileName: 'test.txt' });

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('targetDir', '/config')
        .field('containerName', 'hytale-server');

      expect(res.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith('/config', 'test.txt', expect.any(Buffer), 'hytale-server');
    });

    test('returns 400 when the container name is not provided', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('targetDir', '/config');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Container name is missing');
    });

    test('handles upload error', async () => {
      mockUpload.mockRejectedValue(new Error('Upload failed'));

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('containerName', 'hytale-server');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/files/download', () => {
    test('returns 400 without path', async () => {
      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(400);
    });

    test('downloads file successfully', async () => {
      mockDownload.mockResolvedValue({
        success: true,
        fileName: 'test',
        stream: new Readable({
          read() {
            this.push('content');
            this.push(null);
          }
        })
      });

      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ path: '/test.txt' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/x-tar');
    });

    test('returns 404 when file not found', async () => {
      mockDownload.mockResolvedValue({ success: false });

      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ path: '/missing' });

      expect(res.status).toBe(404);
    });
  });
});
