const { verifyToken, generateToken, getToken } = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    test('generates a valid JWT string', () => {
      const token = generateToken('testuser');
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('generates different tokens for different users', () => {
      const token1 = generateToken('user1');
      const token2 = generateToken('user2');
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    test('verifies valid token', () => {
      const token = generateToken('testuser');
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded.username).toBe('testuser');
    });

    test('returns null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    test('returns null for empty token', () => {
      expect(verifyToken('')).toBeNull();
      expect(verifyToken(null)).toBeNull();
      expect(verifyToken(undefined)).toBeNull();
    });
  });

  describe('getToken', () => {
    test('extracts token from cookie', () => {
      const req = { cookies: { token: 'cookie-token' }, headers: {} };
      expect(getToken(req)).toBe('cookie-token');
    });

    test('extracts token from Authorization header', () => {
      const req = { cookies: {}, headers: { authorization: 'Bearer header-token' } };
      expect(getToken(req)).toBe('header-token');
    });

    test('prefers cookie over header', () => {
      const req = {
        cookies: { token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' }
      };
      expect(getToken(req)).toBe('cookie-token');
    });

    test('returns null when no token', () => {
      const req = { cookies: {}, headers: {} };
      expect(getToken(req)).toBeNull();
    });
  });
});
