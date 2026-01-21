# Desarrollo

Guía para contribuir al proyecto HytalePanel.

## Requisitos

- Node.js 25+
- pnpm
- Docker y Docker Compose
- Git

## Estructura del Proyecto

```
hytalepanel/
├── Dockerfile              # Contenedor del servidor (Java)
├── entrypoint.sh           # Script de inicio
├── docker-compose.yml      # Producción
├── docker-compose.dev.yml  # Desarrollo
└── panel/
    ├── Dockerfile          # Panel producción
    ├── Dockerfile.dev      # Panel desarrollo
    ├── backend/            # Express + Socket.IO
    │   ├── src/
    │   │   ├── config/     # Configuración
    │   │   ├── middleware/ # Autenticación JWT
    │   │   ├── routes/     # API REST
    │   │   ├── services/   # Docker, archivos, mods
    │   │   └── socket/     # Handlers WebSocket
    │   └── __tests__/      # Tests Jest
    └── frontend/           # Svelte 5 + Vite
        └── src/
            └── lib/
                ├── components/  # Componentes UI
                ├── stores/      # Stores Svelte
                ├── services/    # Cliente API
                └── i18n/        # Traducciones
```

## Configuración de Desarrollo

### Con Docker (Recomendado)

```bash
git clone https://github.com/ketbome/hytalepanel.git
cd hytalepanel

docker compose -f docker-compose.dev.yml up --build
```

Abre [http://localhost:5173](http://localhost:5173)

### Sin Docker

```bash
cd panel

# Instalar dependencias
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# Iniciar servidores de desarrollo
pnpm dev
```

## Stack Tecnológico

### Backend

- **Node.js 25** (Alpine)
- **Express 5** + **Socket.IO 4**
- **TypeScript 5.9** (modo estricto)
- **pnpm** como gestor de paquetes
- **Jest** + **ts-jest** para testing
- **Biome** para linting

### Frontend

- **Svelte 5** con runes
- **Vite 6** bundler
- **TypeScript** modo estricto
- **svelte-i18n** para traducciones
- **Biome** + **Knip** para calidad de código

## Patrones de Código

### Servicios Backend

```typescript
// Los servicios retornan objetos de resultado consistentes
async function hacerAlgo(): Promise<OperationResult> {
  try {
    // lógica
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Imports ESM con extensión .js
import config from './config/index.js';
import * as docker from './services/docker.js';
```

### Frontend (Svelte 5 Runes)

```svelte
<script lang="ts">
  // Props
  let { title, onClick }: { title: string; onClick: () => void } = $props();

  // Estado reactivo
  let count = $state(0);

  // Valores derivados
  let doubled = $derived(count * 2);

  // Efectos secundarios
  $effect(() => {
    console.log('Count cambió:', count);
  });
</script>
```

::: danger Patrones Prohibidos
Nunca uses sintaxis de Svelte deprecada:

```svelte
<!-- NO USES -->
export let prop;           // Usa $props()
$: derived = value * 2;    // Usa $derived()
$: { sideEffect(); }       // Usa $effect()
onMount(() => {});         // Usa $effect()
```
:::

## Testing

```bash
cd panel/backend

pnpm test           # Ejecutar todos los tests
pnpm test:watch     # Modo watch
pnpm test:coverage  # Con cobertura
```

## Calidad de Código

```bash
# Verificación de tipos
cd panel/backend && pnpm check
cd panel/frontend && pnpm check

# Linting
cd panel/backend && pnpm lint
cd panel/frontend && pnpm lint

# Detección de código muerto
cd panel/frontend && pnpm knip
```

## Agregar Funcionalidades

### Nuevo Evento Socket

1. Añade handler en `panel/backend/src/socket/handlers.ts`
2. Añade tipos si es necesario
3. Añade listener en `panel/frontend/src/lib/services/socketClient.ts`

### Nueva Traducción

1. Añade clave a todos los archivos en `panel/frontend/src/lib/i18n/locales/`
2. Usa `$_('nombreClave')` en componentes

### Nuevo Store

1. Crea archivo en `panel/frontend/src/lib/stores/`
2. Usa `writable<Type>()` con TypeScript
3. Exporta desde `panel/frontend/src/lib/stores/index.ts`

## Checklist para Pull Request

- [ ] TypeScript compila sin errores
- [ ] Tests pasan
- [ ] Linter pasa
- [ ] Traducciones añadidas para nuevo texto UI
- [ ] Documentación actualizada si es necesario
