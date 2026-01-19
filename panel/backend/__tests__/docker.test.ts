import type { Container } from 'dockerode';

const mockContainer = {
  inspect: jest.fn(),
  exec: jest.fn(),
  restart: jest.fn(),
  stop: jest.fn(),
  start: jest.fn(),
  logs: jest.fn(),
  getArchive: jest.fn(),
  putArchive: jest.fn()
};

const mockDocker = {
  getContainer: jest.fn(() => mockContainer)
};

jest.mock('dockerode', () => jest.fn(() => mockDocker));

import * as docker from '../src/services/docker.js';

describe('Docker Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getStatus', () => {
    test('returns running status with health', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: {
          Running: true,
          Status: 'running',
          StartedAt: '2024-01-01T00:00:00Z',
          Health: { Status: 'healthy' }
        }
      });

      const status = await docker.getStatus();
      expect(status.running).toBe(true);
      expect(status.status).toBe('running');
      expect(status.health).toBe('healthy');
    });

    test('returns not found on error', async () => {
      mockContainer.inspect.mockRejectedValue(new Error('Not found'));
      const status = await docker.getStatus();
      expect(status.running).toBe(false);
      expect(status.status).toBe('not found');
    });

    test('handles missing health status', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true, Status: 'running', StartedAt: '2024-01-01T00:00:00Z' }
      });
      const status = await docker.getStatus();
      expect(status.health).toBe('unknown');
    });
  });

  describe('execCommand', () => {
    test('executes command and returns output', async () => {
      const mockStream = {
        on: jest.fn((event: string, cb: (data?: Buffer | Error) => void) => {
          if (event === 'data') {
            cb(Buffer.concat([Buffer.alloc(8), Buffer.from('test output')]));
          }
          if (event === 'end') setTimeout(() => cb(), 10);
          return mockStream;
        })
      };

      mockContainer.exec.mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockStream)
      });

      const output = await docker.execCommand('echo test');
      expect(output).toContain('test output');
    });

    test('handles stream error', async () => {
      const mockStream = {
        on: jest.fn((event: string, cb: (err?: Error) => void) => {
          if (event === 'error') setTimeout(() => cb(new Error('Stream error')), 10);
          return mockStream;
        })
      };

      mockContainer.exec.mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockStream)
      });

      await expect(docker.execCommand('test')).rejects.toThrow('Stream error');
    });
  });

  describe('sendCommand', () => {
    test('returns success/failure appropriately', async () => {
      const mockStream = {
        on: jest.fn((event: string, cb: () => void) => {
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockContainer.exec.mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockStream)
      });
      expect((await docker.sendCommand('test')).success).toBe(true);

      mockContainer.exec.mockRejectedValue(new Error('Send failed'));
      const result = await docker.sendCommand('test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('Container control', () => {
    test.each(['restart', 'stop', 'start'] as const)('%s returns success/failure', async (action) => {
      mockContainer[action].mockResolvedValue(undefined);
      expect((await docker[action]()).success).toBe(true);

      mockContainer[action].mockRejectedValue(new Error(`${action} failed`));
      expect((await docker[action]()).success).toBe(false);
    });
  });
});
