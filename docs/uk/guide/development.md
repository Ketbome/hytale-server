# Розробка

Посібник для контриб'юторів проекту Hytale Server.

## Вимоги

- Node.js 25+
- pnpm
- Docker та Docker Compose
- Git

## Структура проекту

```
hytale-server/
├── Dockerfile              # Контейнер сервера (Java)
├── entrypoint.sh           # Скрипт запуску
├── docker-compose.yml      # Продакшн
├── docker-compose.dev.yml  # Розробка
└── panel/
    ├── Dockerfile          # Панель продакшн
    ├── Dockerfile.dev      # Панель розробка
    ├── backend/            # Express + Socket.IO
    │   ├── src/
    │   │   ├── config/     # Конфігурація
    │   │   ├── middleware/ # JWT автентифікація
    │   │   ├── routes/     # REST API
    │   │   ├── services/   # Docker, файли, моди
    │   │   └── socket/     # WebSocket обробники
    │   └── __tests__/      # Jest тести
    └── frontend/           # Svelte 5 + Vite
        └── src/
            └── lib/
                ├── components/  # UI компоненти
                ├── stores/      # Svelte stores
                ├── services/    # API клієнт
                └── i18n/        # Переклади
```

## Налаштування розробки

### З Docker (Рекомендовано)

```bash
git clone https://github.com/ketbome/hytale-server.git
cd hytale-server

docker compose -f docker-compose.dev.yml up --build
```

Відкрийте [http://localhost:5173](http://localhost:5173)

### Без Docker

```bash
cd panel

# Встановити залежності
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# Запустити сервери розробки
pnpm dev
```

## Технологічний стек

### Backend

- **Node.js 25** (Alpine)
- **Express 5** + **Socket.IO 4**
- **TypeScript 5.9** (строгий режим)
- **pnpm** менеджер пакетів
- **Jest** + **ts-jest** для тестування
- **Biome** для лінтингу

### Frontend

- **Svelte 5** з runes
- **Vite 6** бандлер
- **TypeScript** строгий режим
- **svelte-i18n** для перекладів
- **Biome** + **Knip** для якості коду

## Патерни коду

### Backend сервіси

```typescript
// Сервіси повертають консистентні об'єкти результату
async function doSomething(): Promise<OperationResult> {
  try {
    // логіка
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ESM імпорти з розширенням .js
import config from './config/index.js';
import * as docker from './services/docker.js';
```

### Frontend (Svelte 5 Runes)

```svelte
<script lang="ts">
  // Props
  let { title, onClick }: { title: string; onClick: () => void } = $props();

  // Реактивний стан
  let count = $state(0);

  // Похідні значення
  let doubled = $derived(count * 2);

  // Побічні ефекти
  $effect(() => {
    console.log('Count змінився:', count);
  });
</script>
```

::: danger Заборонені патерни
Ніколи не використовуйте застарілий синтаксис Svelte:

```svelte
<!-- НЕ ВИКОРИСТОВУЙТЕ -->
export let prop;           // Використовуйте $props()
$: derived = value * 2;    // Використовуйте $derived()
$: { sideEffect(); }       // Використовуйте $effect()
onMount(() => {});         // Використовуйте $effect()
```
:::

## Тестування

```bash
cd panel/backend

pnpm test           # Запустити всі тести
pnpm test:watch     # Режим спостереження
pnpm test:coverage  # З покриттям
```

## Якість коду

```bash
# Перевірка типів
cd panel/backend && pnpm check
cd panel/frontend && pnpm check

# Лінтинг
cd panel/backend && pnpm lint
cd panel/frontend && pnpm lint

# Виявлення мертвого коду
cd panel/frontend && pnpm knip
```

## Додавання функціоналу

### Новий Socket event

1. Додайте обробник в `panel/backend/src/socket/handlers.ts`
2. Додайте типи за потреби
3. Додайте слухач в `panel/frontend/src/lib/services/socketClient.ts`

### Новий переклад

1. Додайте ключ до всіх файлів в `panel/frontend/src/lib/i18n/locales/`
2. Використовуйте `$_('keyName')` в компонентах

### Новий Store

1. Створіть файл в `panel/frontend/src/lib/stores/`
2. Використовуйте `writable<Type>()` з TypeScript
3. Експортуйте з `panel/frontend/src/lib/stores/index.ts`

## Чекліст для Pull Request

- [ ] TypeScript компілюється без помилок
- [ ] Тести проходять
- [ ] Лінтер проходить
- [ ] Переклади додані для нового UI тексту
- [ ] Документація оновлена за потреби
