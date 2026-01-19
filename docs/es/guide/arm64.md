# Soporte ARM64

Ejecutar Hytale Server en dispositivos ARM64 (Apple Silicon, Raspberry Pi, etc.).

## Limitaciones

El binario `hytale-downloader` es **solo x64**. En sistemas ARM64, la descarga automática de archivos no está disponible.

::: info
El servidor de Hytale (Java) funciona nativamente en ARM64 sin problemas.
:::

## Instalación en ARM64

### Opción 1: Descarga Manual de Archivos

1. Descarga los archivos del juego desde [hytale.com](https://hytale.com) en una máquina x64:
   - `HytaleServer.jar`
   - `Assets.zip`

2. Transfiere a tu servidor ARM64:

```bash
scp HytaleServer.jar Assets.zip usuario@servidor-arm:~/hytale/server/
```

3. Deshabilita la descarga automática en `.env`:

```bash
AUTO_DOWNLOAD=false
```

4. Inicia normalmente:

```bash
docker compose up -d
```

### Opción 2: Emulación x64 (Solo Desarrollo)

Para desarrollo en Macs con Apple Silicon, puedes usar emulación Rosetta/QEMU:

```bash
# Build con emulación x64 (más lento)
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.dev.yml build
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.dev.yml up
```

::: warning
La emulación x64 es significativamente más lenta y no se recomienda para producción.
:::

## Apple Silicon (M1/M2/M3)

### Configuración Recomendada

1. Descarga archivos manualmente (Opción 1 arriba)
2. Ejecuta contenedores ARM64 nativos

```bash
# ARM64 nativo (rápido)
docker compose up -d
```

### Configuración de Desarrollo

Para la mejor experiencia de desarrollo en Apple Silicon:

```bash
# 1. Descarga archivos en otra máquina o usa una VM
# 2. Colócalos en la carpeta ./server/
# 3. Ejecuta el entorno de desarrollo nativamente
docker compose -f docker-compose.dev.yml up --build
```

## Raspberry Pi

### Requisitos

- Raspberry Pi 4 o posterior (4GB+ RAM recomendado)
- Raspberry Pi OS 64-bit
- Docker instalado

### Configuración

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Crear proyecto
mkdir ~/hytale && cd ~/hytale

# Descargar archivo compose
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/.env.example
cp .env.example .env

# Configurar (reducir RAM para Pi)
nano .env
```

Configuración recomendada para Pi:

```bash
JAVA_XMS=1G
JAVA_XMX=2G
AUTO_DOWNLOAD=false
```

### Transferir Archivos del Juego

Desde tu computadora principal:

```bash
scp HytaleServer.jar Assets.zip pi@raspberrypi:~/hytale/server/
```

### Iniciar

```bash
docker compose up -d
```

## Solución de Problemas

### "exec format error"

Esto significa que estás intentando ejecutar binarios x64 en ARM64. Solución:
- Usa imágenes ARM64 nativas
- O habilita emulación x64

### Rendimiento lento con emulación

Es esperado. Para producción:
- Usa ARM64 nativo
- Descarga archivos manualmente
- Configura `AUTO_DOWNLOAD=false`

### Sin memoria

Los dispositivos ARM64 suelen tener RAM limitada:
- Reduce `JAVA_XMX` en `.env`
- Cierra otras aplicaciones
- Añade espacio swap si es necesario
