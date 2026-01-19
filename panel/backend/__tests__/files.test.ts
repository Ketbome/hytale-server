jest.mock('../src/services/docker.js', () => ({
  execCommand: jest.fn(),
  getArchive: jest.fn(),
  putArchive: jest.fn()
}));

import * as docker from '../src/services/docker.js';
import * as files from '../src/services/files.js';

const mockDocker = docker as jest.Mocked<typeof docker>;

describe('Files Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Security: sanitizePath', () => {
    test('blocks path traversal attempts', () => {
      expect(() => files.sanitizePath('../../../etc/passwd')).toThrow('Path traversal');
      expect(() => files.sanitizePath('..\\..\\etc\\passwd')).toThrow('Path traversal');
      expect(() => files.sanitizePath('..\\../etc/passwd')).toThrow('Path traversal');
    });
  });

  describe('Security: isAllowedUpload', () => {
    test('allows safe file types', () => {
      expect(files.isAllowedUpload('plugin.jar')).toBe(true);
      expect(files.isAllowedUpload('backup.zip')).toBe(true);
      expect(files.isAllowedUpload('config.json')).toBe(true);
      expect(files.isAllowedUpload('config.yaml')).toBe(true);
    });

    test('blocks dangerous file types', () => {
      expect(files.isAllowedUpload('virus.exe')).toBe(false);
      expect(files.isAllowedUpload('malware.dll')).toBe(false);
      expect(files.isAllowedUpload('hack.com')).toBe(false);
    });

    test('handles case insensitivity', () => {
      expect(files.isAllowedUpload('CONFIG.JSON')).toBe(true);
      expect(files.isAllowedUpload('VIRUS.EXE')).toBe(false);
    });
  });

  describe('checkServerFiles', () => {
    test('returns ready status based on file existence', async () => {
      mockDocker.execCommand.mockResolvedValue('/opt/hytale/HytaleServer.jar\n/opt/hytale/Assets.zip');
      let result = await files.checkServerFiles();
      expect(result.ready).toBe(true);

      mockDocker.execCommand.mockResolvedValue('NO_FILES');
      result = await files.checkServerFiles();
      expect(result.ready).toBe(false);
    });

    test('handles errors gracefully', async () => {
      mockDocker.execCommand.mockRejectedValue(new Error('Container error'));
      const result = await files.checkServerFiles();
      expect(result.ready).toBe(false);
    });
  });

  describe('checkAuth', () => {
    test('returns true when valid credentials exist', async () => {
      mockDocker.execCommand.mockResolvedValue('{"access_token": "abc123"}');
      expect(await files.checkAuth()).toBe(true);
    });

    test('returns false when no credentials', async () => {
      mockDocker.execCommand.mockResolvedValue('NO_AUTH');
      expect(await files.checkAuth()).toBe(false);
    });

    test('returns false on error', async () => {
      mockDocker.execCommand.mockRejectedValue(new Error('Container error'));
      expect(await files.checkAuth()).toBe(false);
    });
  });

  describe('wipeData', () => {
    test('returns success/failure appropriately', async () => {
      mockDocker.execCommand.mockResolvedValue('');
      expect((await files.wipeData()).success).toBe(true);

      mockDocker.execCommand.mockRejectedValue(new Error('Permission denied'));
      expect((await files.wipeData()).success).toBe(false);
    });
  });
});
