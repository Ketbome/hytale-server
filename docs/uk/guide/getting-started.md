# Початок роботи

## Вимоги

- Docker та Docker Compose встановлені
- 4GB+ RAM доступно
- Порт 5520/UDP відкритий (гра) та 3000/TCP (панель)

## Встановлення

### 1. Створити папку проекту

```bash
mkdir hytale && cd hytale
```

### 2. Завантажити файли конфігурації

```bash
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/.env.example
```

### 3. Налаштувати середовище

```bash
cp .env.example .env
```

Відредагуйте `.env` у вашому редакторі:

```bash
# Сервер
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Автентифікація панелі (ЗМІНІТЬ!)
PANEL_USER=admin
PANEL_PASS=ваш_безпечний_пароль
JWT_SECRET=випадковий-рядок

# Часовий пояс
TZ=Europe/Kyiv
```

::: warning
Завжди змінюйте `PANEL_USER` та `PANEL_PASS` перед розгортанням!
:::

### 4. Запустити сервер

```bash
docker compose up -d
```

### 5. Доступ до панелі

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

Облікові дані за замовчуванням:
- **Користувач**: `admin`
- **Пароль**: `admin`

## Загальні команди

```bash
# Переглянути логи
docker compose logs -f

# Зупинити сервер
docker compose down

# Оновити до останньої версії
docker compose pull && docker compose up -d

# Резервне копіювання даних сервера
docker compose stop
tar -czvf backup.tar.gz server/
docker compose start
```

## Налаштування брандмауера

### Linux (UFW)

```bash
ufw allow 5520/udp
ufw allow 3000/tcp
```

### Windows

```powershell
New-NetFirewallRule -DisplayName "Hytale Game" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
New-NetFirewallRule -DisplayName "Hytale Panel" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## Порти

| Сервіс | Порт | Протокол |
|--------|------|----------|
| Ігровий сервер | 5520 | UDP |
| Веб-панель | 3000 | TCP |

## Наступні кроки

- [Налаштувати сервер](/uk/guide/configuration)
- [Дізнатися про веб-панель](/uk/guide/panel)
- [Встановити моди](/uk/guide/mods)
