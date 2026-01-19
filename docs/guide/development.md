# Development

Guide for contributing to the Hytale Server project.

## Prerequisites

- Node.js 25+
- pnpm
- Docker and Docker Compose
- Git

## Project Structure

```
hytale-server/
├── Dockerfile              # Server container (Java)
├── entrypoint.sh           # Server startup script
├── docker-compose.yml      # Production
├── docker-compose.dev.yml  # Development
└── panel/
    ├── Dockerfile          # Panel production
    ├── Dockerfile.dev      # Panel development
    ├── backend/            # Express + Socket.IO
    │   ├── src/
    │   │   ├── config/     # Environment config
    │   │   ├── middleware/ # JWT auth
    │   │   ├── routes/     # REST API
    │   │   ├── services/   # Docker, files, mods
    │   │   └── socket/     # WebSocket handlers
    │   └── __tests__/      # Jest tests
    └── frontend/           # Svelte 5 + Vite
        └── src/
            └── lib/
                ├── components/  # UI components
                ├── stores/      # Svelte stores
                ├── services/    # API client
                └── i18n/        # Translations
```

## Development Setup

### With Docker (Recommended)

```bash
git clone https://github.com/ketbome/hytale-server.git
cd hytale-server

docker compose -f docker-compose.dev.yml up --build
```

Open [http://localhost:5173](http://localhost:5173)

### Without Docker

```bash
cd panel

# Install dependencies
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# Start dev servers
pnpm dev
```

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

### Backend Services

```typescript
// Services return consistent result objects
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
  // Props
  let { title, onClick }: { title: string; onClick: () => void } = $props();

  // Reactive state
  let count = $state(0);

  // Derived values
  let doubled = $derived(count * 2);

  // Side effects
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

::: danger Forbidden Patterns
Never use deprecated Svelte syntax:

```svelte
<!-- DON'T USE -->
export let prop;           // Use $props()
$: derived = value * 2;    // Use $derived()
$: { sideEffect(); }       // Use $effect()
onMount(() => {});         // Use $effect()
```
:::

## Testing

```bash
cd panel/backend

pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # With coverage
```

### Test Files

| File | Coverage |
|------|----------|
| `auth.test.ts` | JWT generation, verification, middleware |
| `docker.test.ts` | Container status, exec, lifecycle |
| `downloader.test.ts` | Download flow, auth detection |
| `files.test.ts` | Path security, file validation |
| `routes.api.test.ts` | Upload/download endpoints |
| `routes.auth.test.ts` | Login/logout/status |
| `config.test.ts` | Configuration validation |

## Code Quality

```bash
# Type checking
cd panel/backend && pnpm check
cd panel/frontend && pnpm check

# Linting
cd panel/backend && pnpm lint
cd panel/frontend && pnpm lint

# Dead code detection
cd panel/frontend && pnpm knip
```

## Adding Features

### New Socket Event

1. Add handler in `panel/backend/src/socket/handlers.ts`
2. Add types if needed
3. Add listener in `panel/frontend/src/lib/services/socketClient.ts`

### New Translation

1. Add key to all files in `panel/frontend/src/lib/i18n/locales/`
2. Use `$_('keyName')` in components

### New Store

1. Create file in `panel/frontend/src/lib/stores/`
2. Use `writable<Type>()` with TypeScript
3. Export from `panel/frontend/src/lib/stores/index.ts`

## Pull Request Checklist

- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] Linter passes
- [ ] Translations added for new UI text
- [ ] Documentation updated if needed
