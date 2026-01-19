import crypto from 'node:crypto';

const defaultSecret = crypto.randomBytes(32).toString('hex');

export interface Config {
  container: {
    name: string;
  };
  server: {
    port: number;
  };
  docker: {
    socketPath: string;
  };
  auth: {
    username: string;
    password: string;
    jwtSecret: string;
    tokenExpiry: string;
  };
  files: {
    basePath: string;
    maxUploadSize: number;
    editableExtensions: string[];
    uploadAllowedExtensions: string[];
  };
  mods: {
    basePath: string;
    metadataFile: string;
    maxModSize: number;
  };
  modtale: {
    apiKey: string | null;
  };
}

const config: Config = {
  container: {
    name: process.env.CONTAINER_NAME || 'hytale-server'
  },
  server: {
    port: Number.parseInt(process.env.PANEL_PORT || '3000', 10)
  },
  docker: {
    socketPath: '/var/run/docker.sock'
  },
  auth: {
    username: process.env.PANEL_USER || 'admin',
    password: process.env.PANEL_PASS || 'admin',
    jwtSecret: process.env.JWT_SECRET || defaultSecret,
    tokenExpiry: '24h'
  },
  files: {
    basePath: '/opt/hytale',
    maxUploadSize: 500 * 1024 * 1024,
    editableExtensions: [
      '.json',
      '.yaml',
      '.yml',
      '.properties',
      '.txt',
      '.cfg',
      '.conf',
      '.xml',
      '.toml',
      '.ini',
      '.lua',
      '.js',
      '.sh',
      '.bat',
      '.md',
      '.log'
    ],
    uploadAllowedExtensions: [
      '.jar',
      '.zip',
      '.tar',
      '.gz',
      '.7z',
      '.rar',
      '.json',
      '.yaml',
      '.yml',
      '.properties',
      '.txt',
      '.cfg',
      '.conf',
      '.xml',
      '.toml',
      '.ini',
      '.lua',
      '.js',
      '.sh',
      '.bat',
      '.dat',
      '.nbt',
      '.mca',
      '.mcr',
      '.db',
      '.ldb',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.ogg',
      '.mp3',
      '.wav',
      '.md',
      '.log',
      '.csv'
    ]
  },
  mods: {
    basePath: '/opt/hytale/mods',
    metadataFile: '/opt/hytale/mods.json',
    maxModSize: 50 * 1024 * 1024
  },
  modtale: {
    apiKey: process.env.MODTALE_API_KEY || null
  }
};

export default config;
