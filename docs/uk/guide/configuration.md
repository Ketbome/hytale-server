# Налаштування

Вся конфігурація виконується через змінні середовища у файлі `.env`.

## Налаштування сервера

| Змінна | За замовчуванням | Опис |
|--------|------------------|------|
| `JAVA_XMS` | `4G` | Мінімальне виділення RAM |
| `JAVA_XMX` | `8G` | Максимальне виділення RAM |
| `BIND_PORT` | `5520` | UDP порт сервера |
| `AUTO_DOWNLOAD` | `true` | Автозавантаження (тільки x64) |
| `SERVER_EXTRA_ARGS` | - | Додаткові аргументи сервера |
| `TZ` | `UTC` | Часовий пояс для логів |

## Налаштування панелі

| Змінна | За замовчуванням | Опис |
|--------|------------------|------|
| `PANEL_USER` | `admin` | Ім'я користувача |
| `PANEL_PASS` | `admin` | Пароль |
| `PANEL_PORT` | `3000` | HTTP порт панелі |
| `JWT_SECRET` | (випадковий) | Ключ підпису JWT |
| `MODTALE_API_KEY` | - | API ключ для Modtale |

## Рекомендації щодо RAM

| Гравці | Рекомендований `JAVA_XMX` |
|--------|---------------------------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |

## Приклад конфігурації

```bash
# Ресурси сервера
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Автозавантаження
AUTO_DOWNLOAD=true

# Додаткові аргументи (напр. для модів)
SERVER_EXTRA_ARGS=--mods mods

# Автентифікація панелі
PANEL_USER=myadmin
PANEL_PASS=супербезпечнийпароль123
JWT_SECRET=мій-секретний-ключ

# Часовий пояс
TZ=Europe/Kyiv

# Інтеграція Modtale (опціонально)
MODTALE_API_KEY=ваш-api-ключ
```

## Налаштування Docker Compose

Ви можете налаштувати volumes та порти в `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./my-mods:/opt/hytale/mods
    ports:
      - "5520:5520/udp"
    environment:
      - JAVA_XMX=16G

  hytale-panel:
    ports:
      - "8080:3000"  # Змінити порт панелі на 8080
```

## Загальні часові пояси

| Регіон | Часовий пояс |
|--------|--------------|
| Україна | `Europe/Kyiv` |
| Польща | `Europe/Warsaw` |
| Німеччина | `Europe/Berlin` |
| Велика Британія | `Europe/London` |

[Повний список часових поясів](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
