# Referencia de Eventos Socket

La comunicación en tiempo real usa Socket.IO. Todos los eventos requieren autenticación.

## Conexión

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'tu-token-jwt' }
});
```

## Eventos de Control del Servidor

### command

Envía un comando a la consola del servidor.

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

Iniciar el contenedor del servidor.

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

Detener el contenedor del servidor.

**Emit:**
```typescript
socket.emit('stop');
```

**Response:** `action-status`

### restart

Reiniciar el contenedor del servidor.

**Emit:**
```typescript
socket.emit('restart');
```

**Response:** `action-status`

### download

Iniciar descarga de archivos del servidor (solo x64).

**Emit:**
```typescript
socket.emit('download');
```

**Response:** Múltiples eventos `download-progress`, luego `download-complete`

### wipe

Eliminar todos los datos del servidor.

**Emit:**
```typescript
socket.emit('wipe');
```

**Response:** `action-status`

## Eventos de Logs

### logs:more

Solicitar historial de logs adicional.

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

### log (recibir)

Streaming de logs en tiempo real.

```typescript
socket.on('log', (line: string) => {
  console.log('Nuevo log:', line);
});
```

## Eventos de Archivos

### files:list

Listar contenido de directorio.

**Emit:**
```typescript
socket.emit('files:list', '/mods');
```

**Response:** `files:list-result`

### files:read

Leer contenido de archivo.

**Emit:**
```typescript
socket.emit('files:read', '/config.json');
```

**Response:** `files:read-result`

### files:save

Guardar contenido de archivo.

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

Crear un directorio.

**Emit:**
```typescript
socket.emit('files:mkdir', '/mods/custom');
```

**Response:** `files:mkdir-result`

### files:delete

Eliminar archivo o directorio.

**Emit:**
```typescript
socket.emit('files:delete', '/mods/old-mod.jar');
```

**Response:** `files:delete-result`

### files:rename

Renombrar archivo o directorio.

**Emit:**
```typescript
socket.emit('files:rename', {
  oldPath: '/mods/mod.jar',
  newPath: '/mods/mod-renamed.jar'
});
```

**Response:** `files:rename-result`

## Eventos de Mods

### mods:list

Listar mods instalados.

**Emit:**
```typescript
socket.emit('mods:list');
```

**Response:** `mods:list-result`

### mods:search

Buscar mods en Modtale.

**Emit:**
```typescript
socket.emit('mods:search', {
  query: 'ejemplo',
  classification: 'MOD',
  page: 1,
  pageSize: 20
});
```

**Response:** `mods:search-result`

### mods:install

Instalar un mod desde Modtale.

**Emit:**
```typescript
socket.emit('mods:install', {
  projectId: 'project-id',
  versionId: 'version-id',
  metadata: {
    versionName: '1.0.0',
    projectTitle: 'Mod Ejemplo',
    classification: 'MOD'
  }
});
```

**Response:** `mods:install-status` (progreso), luego `mods:install-result`

### mods:uninstall

Desinstalar un mod.

**Emit:**
```typescript
socket.emit('mods:uninstall', 'mod-id');
```

**Response:** `mods:uninstall-result`

### mods:enable / mods:disable

Habilitar o deshabilitar un mod.

**Emit:**
```typescript
socket.emit('mods:enable', 'mod-id');
socket.emit('mods:disable', 'mod-id');
```

**Response:** `mods:enable-result` / `mods:disable-result`

### mods:check-updates

Verificar actualizaciones de mods.

**Emit:**
```typescript
socket.emit('mods:check-updates');
```

**Response:** `mods:check-updates-result`

## Eventos de Estado

### status (recibir)

Actualizaciones de estado del servidor (enviadas cada 5 segundos).

```typescript
socket.on('status', (status) => {
  // { running: true, uptime: 3600, ... }
});
```

## Formato de Respuesta

Todas las respuestas de eventos siguen este patrón:

```typescript
interface EventResult {
  success: boolean;
  error?: string;
  // ... datos adicionales
}
```
