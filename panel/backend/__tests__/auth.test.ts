import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';
import {
  verifyToken,
  generateToken,
  getToken,
  requireAuth,
  socketAuth,
  type AuthenticatedRequest,
  type AuthenticatedSocket
} from '../src/middleware/auth.js';

describe('Auth Middleware', () => {
  describe('generateToken / verifyToken', () => {
    test('generates valid JWT that can be verified', () => {
      const token = generateToken('testuser');
      const decoded = verifyToken(token);

      expect(token.split('.').length).toBe(3);
      expect(decoded?.username).toBe('testuser');
    });

    test('returns null for invalid tokens', () => {
      expect(verifyToken('invalid.token')).toBeNull();
      expect(verifyToken('')).toBeNull();
    });
  });

  describe('getToken', () => {
    test('extracts from cookie, header, or returns null', () => {
      expect(getToken({ cookies: { token: 'cookie-token' }, headers: {} } as Request)).toBe('cookie-token');
      expect(getToken({ cookies: {}, headers: { authorization: 'Bearer header-token' } } as unknown as Request)).toBe('header-token');
      expect(getToken({ cookies: {}, headers: {} } as Request)).toBeNull();
      expect(getToken({ cookies: {}, headers: { authorization: 'Basic xyz' } } as unknown as Request)).toBeNull();
    });

    test('prefers cookie over header', () => {
      const req = {
        cookies: { token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' }
      } as unknown as Request;
      expect(getToken(req)).toBe('cookie-token');
    });
  });

  describe('requireAuth middleware', () => {
    const mockRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }) as unknown as Response;

    test('returns 401 without valid token', () => {
      const res = mockRes();
      const next = jest.fn() as NextFunction;

      requireAuth({ cookies: {}, headers: {} } as AuthenticatedRequest, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();

      requireAuth({ cookies: { token: 'invalid' }, headers: {} } as unknown as AuthenticatedRequest, mockRes(), next);
      expect(next).not.toHaveBeenCalled();
    });

    test('calls next() and sets req.user with valid token', () => {
      const token = generateToken('testuser');
      const req = { cookies: { token }, headers: {} } as unknown as AuthenticatedRequest;
      const res = mockRes();
      const next = jest.fn() as NextFunction;

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.username).toBe('testuser');
    });
  });

  describe('socketAuth middleware', () => {
    test('fails without valid token', () => {
      const next = jest.fn();

      socketAuth({ handshake: { auth: {}, headers: {} } } as unknown as AuthenticatedSocket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('succeeds with valid token and sets socket.user', () => {
      const token = generateToken('testuser');
      const socket = { handshake: { auth: { token }, headers: {} } } as unknown as AuthenticatedSocket;
      const next = jest.fn();

      socketAuth(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.user?.username).toBe('testuser');
    });

    test('extracts token from cookie header', () => {
      const token = generateToken('testuser');
      const socket = { handshake: { auth: {}, headers: { cookie: `token=${token}` } } } as unknown as AuthenticatedSocket;
      const next = jest.fn();

      socketAuth(socket, next);

      expect(socket.user?.username).toBe('testuser');
    });
  });
});
