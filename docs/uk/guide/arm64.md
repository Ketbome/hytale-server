# Підтримка ARM64

Запуск Hytale Server на ARM64 пристроях (Apple Silicon, Raspberry Pi тощо).

## Обмеження

Бінарник `hytale-downloader` працює **тільки на x64**. На ARM64 системах автоматичне завантаження файлів гри недоступне.

::: info
Сам сервер Hytale (Java) працює нативно на ARM64 без проблем.
:::

## Встановлення на ARM64

### Варіант 1: Ручне завантаження файлів

1. Завантажте файли гри з [hytale.com](https://hytale.com) на x64 машині:
   - `HytaleServer.jar`
   - `Assets.zip`

2. Перенесіть на ваш ARM64 сервер:

```bash
scp HytaleServer.jar Assets.zip user@arm-server:~/hytale/server/
```

3. Вимкніть автозавантаження в `.env`:

```bash
AUTO_DOWNLOAD=false
```

4. Запустіть як звичайно:

```bash
docker compose up -d
```

### Варіант 2: Емуляція x64 (Тільки для розробки)

Для розробки на Apple Silicon Mac можна використовувати емуляцію Rosetta/QEMU:

```bash
# Build з емуляцією x64 (повільніше)
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.dev.yml build
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.dev.yml up
```

::: warning
Емуляція x64 значно повільніша і не рекомендується для продакшну.
:::

## Apple Silicon (M1/M2/M3)

### Рекомендоване налаштування

1. Завантажте файли вручну (Варіант 1 вище)
2. Запустіть нативні ARM64 контейнери

```bash
# Нативний ARM64 (швидко)
docker compose up -d
```

### Налаштування розробки

Для найкращого досвіду розробки на Apple Silicon:

```bash
# 1. Завантажте файли на іншій машині або використовуйте VM
# 2. Помістіть у папку ./server/
# 3. Запустіть середовище розробки нативно
docker compose -f docker-compose.dev.yml up --build
```

## Raspberry Pi

### Вимоги

- Raspberry Pi 4 або новіший (рекомендовано 4GB+ RAM)
- 64-bit Raspberry Pi OS
- Docker встановлений

### Налаштування

```bash
# Встановити Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Створити проект
mkdir ~/hytale && cd ~/hytale

# Завантажити compose файл
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example
cp .env.example .env

# Налаштувати (зменшити RAM для Pi)
nano .env
```

Рекомендована конфігурація для Pi:

```bash
JAVA_XMS=1G
JAVA_XMX=2G
AUTO_DOWNLOAD=false
```

### Передача файлів гри

З вашого основного комп'ютера:

```bash
scp HytaleServer.jar Assets.zip pi@raspberrypi:~/hytale/server/
```

### Запуск

```bash
docker compose up -d
```

## Усунення несправностей

### "exec format error"

Це означає, що ви намагаєтесь запустити x64 бінарники на ARM64. Рішення:
- Використовуйте нативні ARM64 образи
- Або увімкніть емуляцію x64

### Повільна продуктивність з емуляцією

Очікувано. Для продакшну:
- Використовуйте нативний ARM64
- Завантажте файли гри вручну
- Встановіть `AUTO_DOWNLOAD=false`

### Недостатньо пам'яті

ARM64 пристрої часто мають обмежену RAM:
- Зменште `JAVA_XMX` в `.env`
- Закрийте інші програми
- Додайте swap простір за потреби
