import type { Socket } from 'socket.io';
import type { Container } from 'dockerode';

const mockExec = { start: jest.fn() };
const mockContainer = { exec: jest.fn(() => Promise.resolve(mockExec)) } as unknown as Container;

jest.mock('../src/services/docker.js', () => ({
  getContainer: jest.fn(),
  execCommand: jest.fn()
}));

jest.mock('../src/services/files.js', () => ({
  checkServerFiles: jest.fn(),
  checkAuth: jest.fn()
}));

import * as docker from '../src/services/docker.js';
import * as files from '../src/services/files.js';
import { downloadServerFiles } from '../src/services/downloader.js';

const mockDocker = docker as jest.Mocked<typeof docker>;
const mockFiles = files as jest.Mocked<typeof files>;

describe('Downloader Service', () => {
  let mockSocket: { emit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = { emit: jest.fn() };
    mockDocker.getContainer.mockResolvedValue(mockContainer);
    mockDocker.execCommand.mockResolvedValue('');
    mockFiles.checkServerFiles.mockResolvedValue({ hasJar: false, hasAssets: false, ready: false });
    mockFiles.checkAuth.mockResolvedValue(false);
  });

  const createMockStream = (dataToEmit: string | null, triggerError = false) => ({
    on: jest.fn((event: string, cb: (data?: Buffer | Error) => void) => {
      if (event === 'data' && dataToEmit) cb(Buffer.from(dataToEmit));
      if (event === 'end' && !triggerError) setTimeout(() => cb(), 10);
      if (event === 'error' && triggerError) setTimeout(() => cb(new Error('Stream failed')), 10);
      return { on: jest.fn().mockReturnThis() };
    })
  });

  test('emits error when container not found', async () => {
    mockDocker.getContainer.mockResolvedValue(null);
    await downloadServerFiles(mockSocket as unknown as Socket);
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Container not found'
    });
  });

  test('emits starting status on begin', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    mockDocker.execCommand.mockResolvedValue('NO_ZIP');

    await downloadServerFiles(mockSocket as unknown as Socket);

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'starting',
      message: 'Starting download...'
    });
  });

  test('emits auth-required when OAuth URL or user_code detected', async () => {
    mockExec.start.mockResolvedValue(createMockStream('Visit oauth.accounts.hytale.com'));
    mockDocker.execCommand.mockResolvedValue('NO_ZIP');

    await downloadServerFiles(mockSocket as unknown as Socket);

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'auth-required',
      message: expect.stringContaining('oauth.accounts.hytale.com')
    });
  });

  test('emits error on 403 Forbidden', async () => {
    mockExec.start.mockResolvedValue(createMockStream('403 Forbidden'));
    mockDocker.execCommand.mockResolvedValue('NO_ZIP');

    await downloadServerFiles(mockSocket as unknown as Socket);

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Authentication failed or expired. Try again.'
    });
  });

  test('extracts files when zip found', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    mockDocker.execCommand.mockImplementation((cmd: string) =>
      cmd.includes('ls /tmp/hytale-game.zip')
        ? Promise.resolve('/tmp/hytale-game.zip')
        : Promise.resolve('')
    );
    mockFiles.checkServerFiles.mockResolvedValue({ hasJar: true, hasAssets: true, ready: true });

    await downloadServerFiles(mockSocket as unknown as Socket);
    await new Promise(r => setTimeout(r, 50));

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'extracting',
      message: 'Extracting files...'
    });
  });

  test('handles stream error', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null, true));

    await downloadServerFiles(mockSocket as unknown as Socket);
    await new Promise(r => setTimeout(r, 50));

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Stream failed'
    });
  });
});
