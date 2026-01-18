// Test pure functions from files service
// Note: Functions that use Docker are tested in integration tests

const path = require('path');

// Mock docker service to avoid actual Docker calls
jest.mock('../src/services/docker', () => ({
  execCommand: jest.fn(),
  getArchive: jest.fn(),
  putArchive: jest.fn()
}));

const files = require('../src/services/files');
const config = require('../src/config');

describe('Files Service', () => {
  describe('sanitizePath', () => {
    // Note: sanitizePath uses Linux paths (runs in Docker container)
    // These tests verify security, not exact paths

    test('blocks path traversal with ../', () => {
      expect(() => files.sanitizePath('../../../etc/passwd')).toThrow('Path traversal');
    });

    test('blocks path traversal with encoded chars', () => {
      expect(() => files.sanitizePath('..\\..\\etc\\passwd')).toThrow('Path traversal');
    });

    test('blocks path traversal with mixed separators', () => {
      expect(() => files.sanitizePath('..\\../etc/passwd')).toThrow('Path traversal');
    });
  });

  describe('isAllowedUpload', () => {
    test('allows .jar files', () => {
      expect(files.isAllowedUpload('plugin.jar')).toBe(true);
    });

    test('allows .zip files', () => {
      expect(files.isAllowedUpload('backup.zip')).toBe(true);
    });

    test('allows .json files', () => {
      expect(files.isAllowedUpload('config.json')).toBe(true);
    });

    test('allows .yaml files', () => {
      expect(files.isAllowedUpload('config.yaml')).toBe(true);
      expect(files.isAllowedUpload('config.yml')).toBe(true);
    });

    test('rejects .exe files', () => {
      expect(files.isAllowedUpload('virus.exe')).toBe(false);
    });

    test('rejects .sh files', () => {
      expect(files.isAllowedUpload('script.sh')).toBe(false);
    });

    test('handles case insensitivity', () => {
      expect(files.isAllowedUpload('CONFIG.JSON')).toBe(true);
      expect(files.isAllowedUpload('Plugin.JAR')).toBe(true);
    });
  });

  describe('getRelativePath', () => {
    test('removes base path', () => {
      const fullPath = config.files.basePath + '/config/test.json';
      expect(files.getRelativePath(fullPath)).toBe('/config/test.json');
    });

    test('returns / for base path', () => {
      expect(files.getRelativePath(config.files.basePath)).toBe('/');
    });
  });
});
