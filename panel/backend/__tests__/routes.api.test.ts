import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { Readable } from 'node:stream';
import { generateToken } from '../src/middleware/auth.js';

jest.mock('../src/services/files.js', () => ({
  upload: jest.fn(),
  download: jest.fn()
}));

import * as files from '../src/services/files.js';
import apiRoutes from '../src/routes/api.js';

const mockFiles = files as jest.Mocked<typeof files>;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  const validToken = generateToken('admin');

  beforeEach(() => jest.clearAllMocks());

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
      mockFiles.upload.mockResolvedValue({ success: true, fileName: 'test.txt' });

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('targetDir', '/config');

      expect(res.status).toBe(200);
      expect(mockFiles.upload).toHaveBeenCalledWith('/config', 'test.txt', expect.any(Buffer));
    });

    test('handles upload error', async () => {
      mockFiles.upload.mockRejectedValue(new Error('Upload failed'));

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt');

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
      mockFiles.download.mockResolvedValue({
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
      mockFiles.download.mockResolvedValue({ success: false });

      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ path: '/missing' });

      expect(res.status).toBe(404);
    });
  });
});
