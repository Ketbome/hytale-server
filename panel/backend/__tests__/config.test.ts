import config from '../src/config/index.js';

describe('Config', () => {
  test('has required sections', () => {
    expect(config).toHaveProperty('container');
    expect(config).toHaveProperty('server');
    expect(config).toHaveProperty('docker');
    expect(config).toHaveProperty('auth');
    expect(config).toHaveProperty('files');
  });

  test('container has name', () => {
    expect(config.container.name).toBeDefined();
    expect(typeof config.container.name).toBe('string');
  });

  test('server has port', () => {
    expect(config.server.port).toBeDefined();
    expect(typeof config.server.port).toBe('number');
  });

  test('auth has required fields', () => {
    expect(config.auth.username).toBeDefined();
    expect(config.auth.password).toBeDefined();
    expect(config.auth.jwtSecret).toBeDefined();
    expect(config.auth.tokenExpiry).toBeDefined();
  });

  test('files has valid extensions', () => {
    expect(Array.isArray(config.files.editableExtensions)).toBe(true);
    expect(Array.isArray(config.files.uploadAllowedExtensions)).toBe(true);
    expect(config.files.editableExtensions.length).toBeGreaterThan(0);
  });

  test('maxUploadSize is reasonable', () => {
    expect(config.files.maxUploadSize).toBeGreaterThan(0);
    expect(config.files.maxUploadSize).toBeLessThanOrEqual(500 * 1024 * 1024);
  });
});
