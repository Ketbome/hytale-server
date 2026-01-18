# AI Agents Guide

Instructions for AI coding assistants working on this project.

## Project Overview

Docker-based Hytale dedicated server with web admin panel. Two main components:

1. **Server Container**: Runs Hytale dedicated server (Java)
2. **Panel Container**: Node.js web panel for management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Host                             │
│  ┌─────────────────┐      ┌─────────────────────────────┐  │
│  │  hytale-server  │◄────►│       hytale-panel          │  │
│  │   (Java/Game)   │      │   (Node.js/Express/Socket)  │  │
│  │   Port: 5520    │      │      Port: 3000             │  │
│  └─────────────────┘      └─────────────────────────────┘  │
│         ▲                            │                       │
│         │ /opt/hytale (volume)       │ docker.sock           │
│         └────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

### Backend (panel/src/)

| File | Purpose |
|------|---------|
| `server.js` | Express app entry, ~30 lines |
| `config/index.js` | Centralized configuration |
| `services/docker.js` | Docker API interactions |
| `services/files.js` | File manager operations |
| `services/downloader.js` | Hytale game downloader |
| `middleware/auth.js` | JWT authentication |
| `routes/auth.js` | Login/logout endpoints |
| `routes/api.js` | Protected file API |
| `socket/handlers.js` | WebSocket event handlers |

### Frontend (panel/public/)

| File | Purpose |
|------|---------|
| `index.html` | Single page, minimal HTML |
| `css/styles.css` | All styles, Minecraft theme |
| `js/app.js` | Main application logic |
| `js/auth.js` | Login/session handling |
| `js/fileManager.js` | File browser module |
| `js/console.js` | Log console module |
| `js/i18n.js` | Translations (EN/ES/UK) |
| `js/utils.js` | Helper functions |

## Coding Patterns

### Backend

```javascript
// Services return consistent objects
async function doSomething() {
  try {
    // logic
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Socket handlers are simple
socket.on('event', async (data) => {
  const result = await service.doSomething(data);
  socket.emit('event-result', result);
});
```

### Frontend

```javascript
// Modules are objects with init()
const MyModule = {
  init(socket) {
    this.socket = socket;
    this.bindEvents();
  },
  bindEvents() { /* ... */ }
};

// DOM helper
const $ = id => document.getElementById(id);

// Translations
t('keyName'); // Returns translated string
```

## Common Tasks

### Adding a new API endpoint

1. Add route in `panel/src/routes/api.js`
2. Add service function in appropriate `services/*.js`
3. Routes are already protected by `requireAuth` middleware

### Adding a new Socket event

1. Add handler in `panel/src/socket/handlers.js`
2. Add frontend listener in `panel/public/js/app.js`
3. Sockets are already protected by `socketAuth` middleware

### Adding a translation

1. Add key to all languages in `panel/public/js/i18n.js`
2. Use `t('keyName')` in JS

### Modifying Docker config

1. Update `.env.example` with new variables
2. Update `docker-compose.yml` with `${VAR:-default}`
3. Update `panel/src/config/index.js` if backend needs it

### ARM64 Support

- Auto-downloader is **x64 only** (skipped on ARM64)
- Server (Java) runs natively on ARM64
- Users must manually copy `HytaleServer.jar` and `Assets.zip`

### Server Arguments

Server args are configured in `entrypoint.sh`. Some options were removed because they're not supported by current Hytale server:
- ❌ `--max-players` (not available)
- ❌ `--view-distance` (not available)
- ❌ `--name` (not available)

Use `SERVER_EXTRA_ARGS` env var for custom server arguments (e.g. `--mods mods`).

## Don'ts

- ❌ Don't use TypeScript (keep it simple)
- ❌ Don't add React/Vue/frameworks (vanilla JS)
- ❌ Don't add unnecessary dependencies
- ❌ Don't create README/docs unless asked
- ❌ Don't refactor without reason
- ❌ Don't add features not requested

## Do's

- ✅ Keep functions small and focused
- ✅ Return consistent response objects
- ✅ Use existing patterns in the codebase
- ✅ Preserve the Minecraft/retro UI style
- ✅ Test changes with Docker
- ✅ Update translations when adding UI text

## Environment

- **Node.js**: 18+
- **Docker**: Required for testing
- **No build step**: Frontend is vanilla JS
- **Entry point**: `panel/src/server.js`

## Testing

Tests use Jest + Supertest. Run from `panel/` directory:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Files

| File | What it tests |
|------|---------------|
| `auth.test.js` | JWT generation, verification, middleware |
| `docker.test.js` | Container status, exec, start/stop/restart |
| `downloader.test.js` | Download flow, auth detection, errors |
| `files.test.js` | Path security, file validation |
| `routes.api.test.js` | Upload/download endpoints |
| `routes.auth.test.js` | Login/logout/status |

### Coverage Thresholds

Global minimum: **80% statements, 70% branches**

Excluded from coverage:
- `server.js` - Entry point, no logic
- `socket/handlers.js` - Requires full Socket.IO integration
- `services/files.js` - Heavy Docker dependency

### Writing Tests

```javascript
// Mock Docker before importing
jest.mock('../src/services/docker', () => ({
  execCommand: jest.fn(),
  getStatus: jest.fn()
}));

const docker = require('../src/services/docker');

test('example', async () => {
  docker.execCommand.mockResolvedValue('output');
  // test logic
});
```

## Quick Commands

```bash
# Dev with hot reload (manual restart needed)
cd panel && npm start

# Run tests
cd panel && npm test

# Full Docker test
docker-compose -f docker-compose.dev.yml up --build

# Check logs
docker logs -f hytale-panel
```
