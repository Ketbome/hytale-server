# Socket Events Reference

Real-time communication uses Socket.IO. All events require authentication.

## Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
```

## Server Control Events

### command

Send a command to the server console.

**Emit:**
```typescript
socket.emit('command', '/help');
```

**Response:** `command-result`
```typescript
socket.on('command-result', (result) => {
  // { cmd: '/help', success: true }
});
```

### start

Start the server container.

**Emit:**
```typescript
socket.emit('start');
```

**Response:** `action-status`
```typescript
socket.on('action-status', (result) => {
  // { action: 'start', success: true }
});
```

### stop

Stop the server container.

**Emit:**
```typescript
socket.emit('stop');
```

**Response:** `action-status`

### restart

Restart the server container.

**Emit:**
```typescript
socket.emit('restart');
```

**Response:** `action-status`

### download

Trigger server file download (x64 only).

**Emit:**
```typescript
socket.emit('download');
```

**Response:** Multiple `download-progress` events, then `download-complete`

### wipe

Delete all server data.

**Emit:**
```typescript
socket.emit('wipe');
```

**Response:** `action-status`

## Log Events

### logs:more

Request additional log history.

**Emit:**
```typescript
socket.emit('logs:more', {
  currentCount: 100,
  batchSize: 200
});
```

**Response:** `logs:history`
```typescript
socket.on('logs:history', (data) => {
  // { logs: string[], initial: false, hasMore: true }
});
```

### log (receive)

Real-time log streaming.

```typescript
socket.on('log', (line: string) => {
  console.log('New log:', line);
});
```

## File Events

### files:list

List directory contents.

**Emit:**
```typescript
socket.emit('files:list', '/mods');
```

**Response:** `files:list-result`
```typescript
socket.on('files:list-result', (result) => {
  // { success: true, files: [...], path: '/mods' }
});
```

### files:read

Read file contents.

**Emit:**
```typescript
socket.emit('files:read', '/config.json');
```

**Response:** `files:read-result`
```typescript
socket.on('files:read-result', (result) => {
  // { success: true, content: '...', path: '/config.json' }
});
```

### files:save

Save file contents.

**Emit:**
```typescript
socket.emit('files:save', {
  path: '/config.json',
  content: '{"key": "value"}',
  createBackup: true
});
```

**Response:** `files:save-result`

### files:mkdir

Create a directory.

**Emit:**
```typescript
socket.emit('files:mkdir', '/mods/custom');
```

**Response:** `files:mkdir-result`

### files:delete

Delete a file or directory.

**Emit:**
```typescript
socket.emit('files:delete', '/mods/old-mod.jar');
```

**Response:** `files:delete-result`

### files:rename

Rename a file or directory.

**Emit:**
```typescript
socket.emit('files:rename', {
  oldPath: '/mods/mod.jar',
  newPath: '/mods/mod-renamed.jar'
});
```

**Response:** `files:rename-result`

### check-files

Check if server files exist.

**Emit:**
```typescript
socket.emit('check-files');
```

**Response:** `files` and `downloader-auth`

## Mod Events

### mods:list

List installed mods.

**Emit:**
```typescript
socket.emit('mods:list');
```

**Response:** `mods:list-result`
```typescript
socket.on('mods:list-result', (result) => {
  // { success: true, mods: [...] }
});
```

### mods:search

Search Modtale for mods.

**Emit:**
```typescript
socket.emit('mods:search', {
  query: 'example',
  classification: 'MOD',
  page: 1,
  pageSize: 20
});
```

**Response:** `mods:search-result`

### mods:get

Get mod details from Modtale.

**Emit:**
```typescript
socket.emit('mods:get', 'project-id');
```

**Response:** `mods:get-result`

### mods:install

Install a mod from Modtale.

**Emit:**
```typescript
socket.emit('mods:install', {
  projectId: 'project-id',
  versionId: 'version-id',
  metadata: {
    versionName: '1.0.0',
    projectTitle: 'Example Mod',
    classification: 'MOD'
  }
});
```

**Response:** `mods:install-status` (progress), then `mods:install-result`

### mods:uninstall

Uninstall a mod.

**Emit:**
```typescript
socket.emit('mods:uninstall', 'mod-id');
```

**Response:** `mods:uninstall-result`

### mods:enable / mods:disable

Enable or disable a mod.

**Emit:**
```typescript
socket.emit('mods:enable', 'mod-id');
socket.emit('mods:disable', 'mod-id');
```

**Response:** `mods:enable-result` / `mods:disable-result`

### mods:check-updates

Check for mod updates.

**Emit:**
```typescript
socket.emit('mods:check-updates');
```

**Response:** `mods:check-updates-result`
```typescript
socket.on('mods:check-updates-result', (result) => {
  // { success: true, updates: [...] }
});
```

### mods:update

Update a mod to a new version.

**Emit:**
```typescript
socket.emit('mods:update', {
  modId: 'mod-id',
  versionId: 'new-version-id',
  metadata: {
    versionName: '1.1.0'
  }
});
```

**Response:** `mods:update-status` (progress), then `mods:update-result`

### mods:check-config

Check if Modtale is configured.

**Emit:**
```typescript
socket.emit('mods:check-config');
```

**Response:** `mods:config-status`
```typescript
socket.on('mods:config-status', (result) => {
  // { configured: true }
});
```

### mods:classifications

Get available mod classifications.

**Emit:**
```typescript
socket.emit('mods:classifications');
```

**Response:** `mods:classifications-result`

## Status Events

### status (receive)

Server status updates (sent every 5 seconds).

```typescript
socket.on('status', (status) => {
  // { running: true, uptime: 3600, ... }
});
```

## Response Format

All event responses follow this pattern:

```typescript
interface EventResult {
  success: boolean;
  error?: string;
  // ... additional data
}
```
