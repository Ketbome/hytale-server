# Довідник Socket подій

Комунікація в реальному часі використовує Socket.IO. Всі події вимагають автентифікації.

## З'єднання

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'ваш-jwt-токен' }
});
```

## Події керування сервером

### command

Надіслати команду до консолі сервера.

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

Запустити контейнер сервера.

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

Зупинити контейнер сервера.

**Emit:**
```typescript
socket.emit('stop');
```

**Response:** `action-status`

### restart

Перезапустити контейнер сервера.

**Emit:**
```typescript
socket.emit('restart');
```

**Response:** `action-status`

### download

Запустити завантаження файлів сервера (тільки x64).

**Emit:**
```typescript
socket.emit('download');
```

**Response:** Кілька подій `download-progress`, потім `download-complete`

### wipe

Видалити всі дані сервера.

**Emit:**
```typescript
socket.emit('wipe');
```

**Response:** `action-status`

## Події логів

### logs:more

Запит додаткової історії логів.

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

### log (отримання)

Стрімінг логів в реальному часі.

```typescript
socket.on('log', (line: string) => {
  console.log('Новий лог:', line);
});
```

## Події файлів

### files:list

Список вмісту директорії.

**Emit:**
```typescript
socket.emit('files:list', '/mods');
```

**Response:** `files:list-result`

### files:read

Читання вмісту файлу.

**Emit:**
```typescript
socket.emit('files:read', '/config.json');
```

**Response:** `files:read-result`

### files:save

Збереження вмісту файлу.

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

Створення директорії.

**Emit:**
```typescript
socket.emit('files:mkdir', '/mods/custom');
```

**Response:** `files:mkdir-result`

### files:delete

Видалення файлу або директорії.

**Emit:**
```typescript
socket.emit('files:delete', '/mods/old-mod.jar');
```

**Response:** `files:delete-result`

### files:rename

Перейменування файлу або директорії.

**Emit:**
```typescript
socket.emit('files:rename', {
  oldPath: '/mods/mod.jar',
  newPath: '/mods/mod-renamed.jar'
});
```

**Response:** `files:rename-result`

## Події модів

### mods:list

Список встановлених модів.

**Emit:**
```typescript
socket.emit('mods:list');
```

**Response:** `mods:list-result`

### mods:search

Пошук модів в Modtale.

**Emit:**
```typescript
socket.emit('mods:search', {
  query: 'приклад',
  classification: 'MOD',
  page: 1,
  pageSize: 20
});
```

**Response:** `mods:search-result`

### mods:install

Встановлення моду з Modtale.

**Emit:**
```typescript
socket.emit('mods:install', {
  projectId: 'project-id',
  versionId: 'version-id',
  metadata: {
    versionName: '1.0.0',
    projectTitle: 'Приклад Мод',
    classification: 'MOD'
  }
});
```

**Response:** `mods:install-status` (прогрес), потім `mods:install-result`

### mods:uninstall

Видалення моду.

**Emit:**
```typescript
socket.emit('mods:uninstall', 'mod-id');
```

**Response:** `mods:uninstall-result`

### mods:enable / mods:disable

Увімкнення або вимкнення моду.

**Emit:**
```typescript
socket.emit('mods:enable', 'mod-id');
socket.emit('mods:disable', 'mod-id');
```

**Response:** `mods:enable-result` / `mods:disable-result`

### mods:check-updates

Перевірка оновлень модів.

**Emit:**
```typescript
socket.emit('mods:check-updates');
```

**Response:** `mods:check-updates-result`

## Події статусу

### status (отримання)

Оновлення статусу сервера (надсилається кожні 5 секунд).

```typescript
socket.on('status', (status) => {
  // { running: true, uptime: 3600, ... }
});
```

## Формат відповіді

Всі відповіді подій слідують цьому патерну:

```typescript
interface EventResult {
  success: boolean;
  error?: string;
  // ... додаткові дані
}
```
