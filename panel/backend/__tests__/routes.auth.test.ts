import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import authRoutes from '../src/routes/auth.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /auth/login', () => {
    test('rejects missing or invalid credentials', async () => {
      let res = await request(app).post('/auth/login').send({});
      expect(res.status).toBe(400);

      res = await request(app).post('/auth/login').send({ username: 'wrong', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    test('returns token with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    test('clears cookie and returns success', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /auth/status', () => {
    test('returns 401 without token, 200 with valid token', async () => {
      let res = await request(app).get('/auth/status');
      expect(res.status).toBe(401);

      const loginRes = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin' });

      res = await request(app)
        .get('/auth/status')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
    });
  });

  describe('GET /auth/check-defaults', () => {
    test('detects default credentials', async () => {
      const res = await request(app).get('/auth/check-defaults');
      expect(res.status).toBe(200);
      expect(res.body.usingDefaults).toBe(true);
    });
  });
});
