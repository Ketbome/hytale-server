# AI Agents Guide

Instructions for AI coding assistants working on this project.

## Project Overview

Docker-based Hytale dedicated server with web admin panel. Two main components:

1. **Server Container**: Runs Hytale dedicated server (Java)
2. **Panel Container**: Node.js/TypeScript backend + Svelte 5 frontend

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Host                             │
│  ┌─────────────────┐      ┌─────────────────────────────┐  │
│  │  hytale-server  │◄────►│       hytale-panel          │  │
│  │   (Java/Game)   │      │   (Node.js + Svelte 5)      │  │
│  │   Port: 5520    │      │   Ports: 3000, 5173         │  │
│  └─────────────────┘      └─────────────────────────────┘  │
│         ▲                            │                       │
│         │ /opt/hytale (volume)       │ docker.sock           │
│         └────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
hytale-server/
├── Dockerfile              # Server container (Java)
├── entrypoint.sh           # Server startup script
├── docker-compose.yml      # Production
├── docker-compose.dev.yml  # Development with hot-reload
└── panel/
    ├── Dockerfile          # Panel production
    ├── Dockerfile.dev      # Panel development
    ├── tsconfig.base.json  # Shared TS config
    ├── biome.json          # Shared linter config
    ├── backend/
    │   ├── src/
    │   │   ├── config/     # Environment config
    │   │   ├── middleware/ # JWT auth
    │   │   ├── routes/     # REST API
    │   │   ├── services/   # Docker, files, mods, Modtale
    │   │   ├── socket/     # Real-time handlers
    │   │   └── server.ts   # Entry point
    │   ├── __tests__/      # Jest tests (TypeScript)
    │   ├── jest.config.ts
    │   └── tsconfig.json
    └── frontend/
        ├── src/
        │   ├── lib/
        │   │   ├── components/  # Svelte 5 components
        │   │   ├── stores/      # Svelte stores
        │   │   ├── services/    # Socket client, API
        │   │   ├── types/       # TypeScript interfaces
        │   │   └── i18n/        # Locales (en, es, uk)
        │   └── main.ts
        ├── tsconfig.json
        └── vite.config.ts
```

## Key Files

### Backend (panel/backend/src/)

| File | Purpose |
|------|---------|
| `server.ts` | Express app entry |
| `config/index.ts` | Centralized configuration |
| `services/docker.ts` | Docker API interactions |
| `services/files.ts` | File manager operations |
| `services/mods.ts` | Mod management |
| `services/modtale.ts` | Modtale API client |
| `middleware/auth.ts` | JWT authentication |
| `socket/handlers.ts` | WebSocket events |

### Frontend (panel/frontend/src/lib/)

| Path | Purpose |
|------|---------|
| `components/` | Svelte 5 UI components |
| `stores/` | Application state (auth, server, files, mods) |
| `services/socketClient.ts` | Socket.IO wrapper |
| `services/api.ts` | REST API calls |
| `types/index.ts` | TypeScript interfaces |
| `i18n/locales/` | Translations (JSON) |

## Tech Stack

### Backend
- **Node.js 25** (Alpine)
- **Express 5** + **Socket.IO 4**
- **TypeScript 5.9** (strict mode)
- **pnpm** package manager
- **Jest** + **ts-jest** for testing
- **Biome** for linting

### Frontend
- **Svelte 5** with runes
- **Vite 6** bundler
- **TypeScript** strict mode
- **svelte-i18n** for translations
- **Biome** + **Knip** for code quality

## Coding Patterns

### Backend (TypeScript)

```typescript
// Services return consistent objects
async function doSomething(): Promise<OperationResult> {
  try {
    // logic
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ESM imports with .js extension
import config from './config/index.js';
import * as docker from './services/docker.js';
```

### Frontend (Svelte 5 Runes)

```svelte
<script lang="ts">
  import { someStore } from '$lib/stores/example';

  // Props with $props()
  let { title, onClick }: { title: string; onClick: () => void } = $props();

  // Reactive state with $state()
  let count = $state(0);

  // Derived values with $derived()
  let doubled = $derived(count * 2);

  // Side effects with $effect()
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

### FORBIDDEN Svelte Patterns (deprecated)

```svelte
<!-- ❌ NEVER USE THESE -->
<script>
  export let prop;           // Use $props() instead
  $: derived = value * 2;    // Use $derived() instead
  $: { sideEffect(); }       // Use $effect() instead

  import { onMount } from 'svelte';
  onMount(() => {});         // Use $effect() instead

  import { afterUpdate } from 'svelte';
  afterUpdate(() => {});     // Use $effect() + tick() instead
</script>
```

## Common Tasks

### Adding a new Socket event

1. Add handler in `panel/backend/src/socket/handlers.ts`
2. Add TypeScript types if needed
3. Add frontend listener in `panel/frontend/src/lib/services/socketClient.ts`

### Adding a translation

1. Add key to all JSON files in `panel/frontend/src/lib/i18n/locales/`
2. Use `$_('keyName')` in Svelte components

### Adding a new store

1. Create file in `panel/frontend/src/lib/stores/`
2. Use `writable<Type>()` with TypeScript
3. Export from `panel/frontend/src/lib/stores/index.ts`

## Don'ts

- ❌ Don't use JavaScript files (TypeScript only)
- ❌ Don't use deprecated Svelte patterns (`$:`, `export let`, lifecycle hooks)
- ❌ Don't add unnecessary dependencies
- ❌ Don't create README/docs unless asked
- ❌ Don't refactor without reason
- ❌ Don't add features not requested

## Do's

- ✅ Use TypeScript everywhere
- ✅ Use Svelte 5 runes ($state, $derived, $effect, $props)
- ✅ Keep functions small and focused
- ✅ Return consistent response objects
- ✅ Use existing patterns in the codebase
- ✅ Preserve the retro UI style
- ✅ Update translations when adding UI text
- ✅ Run `pnpm check` before committing

## Testing

```bash
cd panel/backend
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
```

### Test Files

| File | What it tests |
|------|---------------|
| `auth.test.ts` | JWT generation, verification, middleware |
| `docker.test.ts` | Container status, exec, start/stop/restart |
| `downloader.test.ts` | Download flow, auth detection |
| `files.test.ts` | Path security, file validation |
| `routes.api.test.ts` | Upload/download endpoints |
| `routes.auth.test.ts` | Login/logout/status |
| `config.test.ts` | Configuration validation |

## Quick Commands

```bash
# Development (with hot reload)
docker compose -f docker-compose.dev.yml up --build

# Or locally:
cd panel
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..
pnpm dev

# Type checking
cd panel/backend && pnpm check
cd panel/frontend && pnpm check

# Linting
cd panel/backend && pnpm lint
cd panel/frontend && pnpm lint && pnpm knip

# Tests
cd panel/backend && pnpm test

# Build
docker build -t hytale-panel ./panel
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTAINER_NAME` | `hytale-server` | Target Docker container |
| `PANEL_PORT` | `3000` | Panel HTTP port |
| `PANEL_USER` | `admin` | Auth username |
| `PANEL_PASS` | `admin` | Auth password |
| `JWT_SECRET` | (random) | JWT signing key |
| `MODTALE_API_KEY` | - | Modtale API key |

## ARM64 Support

- Auto-downloader is **x64 only** (skipped on ARM64)
- Server (Java) runs natively on ARM64
- Users must manually copy `HytaleServer.jar` and `Assets.zip`
