// Security and core functionality tests for files service

jest.mock('../src/services/docker', () => ({
  execCommand: jest.fn(),
  getArchive: jest.fn(),
  putArchive: jest.fn()
}));

const docker = require('../src/services/docker');
const files = require('../src/services/files');

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
      docker.execCommand.mockResolvedValue('/opt/hytale/HytaleServer.jar\n/opt/hytale/Assets.zip');
      let result = await files.checkServerFiles();
      expect(result.ready).toBe(true);

      docker.execCommand.mockResolvedValue('NO_FILES');
      result = await files.checkServerFiles();
      expect(result.ready).toBe(false);
    });

    test('handles errors gracefully', async () => {
      docker.execCommand.mockRejectedValue(new Error('Container error'));
      const result = await files.checkServerFiles();
      expect(result.ready).toBe(false);
    });
  });

  describe('checkAuth', () => {
    test('returns true when valid credentials exist', async () => {
      docker.execCommand.mockResolvedValue('{"access_token": "abc123"}');
      expect(await files.checkAuth()).toBe(true);
    });

    test('returns false when no credentials', async () => {
      docker.execCommand.mockResolvedValue('NO_AUTH');
      expect(await files.checkAuth()).toBe(false);
    });

    test('returns false on error', async () => {
      docker.execCommand.mockRejectedValue(new Error('Container error'));
      expect(await files.checkAuth()).toBe(false);
    });
  });

  describe('wipeData', () => {
    test('returns success/failure appropriately', async () => {
      docker.execCommand.mockResolvedValue('');
      expect((await files.wipeData()).success).toBe(true);

      docker.execCommand.mockRejectedValue(new Error('Permission denied'));
      expect((await files.wipeData()).success).toBe(false);
    });
  });
});
