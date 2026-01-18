const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

// Create test app with auth routes
const authRoutes = require('../src/routes/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /auth/login', () => {
    test('returns 400 without credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 401 with wrong username', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'wronguser', password: 'changeme' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    test('returns 401 with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    test('returns token with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'changeme' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    test('clears cookie and returns success', async () => {
      const res = await request(app)
        .post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /auth/status', () => {
    test('returns 401 without token', async () => {
      const res = await request(app)
        .get('/auth/status');

      expect(res.status).toBe(401);
    });

    test('returns authenticated with valid token', async () => {
      // First login
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'changeme' });

      const token = loginRes.body.token;

      // Then check status
      const res = await request(app)
        .get('/auth/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.username).toBe('admin');
    });
  });

  describe('GET /auth/check-defaults', () => {
    test('detects default credentials', async () => {
      const res = await request(app)
        .get('/auth/check-defaults');

      expect(res.status).toBe(200);
      expect(res.body.usingDefaults).toBe(true);
    });
  });
});
