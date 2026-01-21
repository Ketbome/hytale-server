# ARM64 Support

Running Hytale Server on ARM64 devices (Apple Silicon, Raspberry Pi, etc.).

## Limitations

The `hytale-downloader` binary is **x64 only**. On ARM64 systems, automatic download of game files is not available.

::: info
The Hytale server itself (Java) runs natively on ARM64 without issues.
:::

## Installation on ARM64

### Option 1: Manual File Download

1. Download game files from [hytale.com](https://hytale.com) on an x64 machine:
   - `HytaleServer.jar`
   - `Assets.zip`

2. Transfer to your ARM64 server:

```bash
scp HytaleServer.jar Assets.zip user@arm-server:~/hytale/server/
```

3. Disable auto-download in `.env`:

```env
AUTO_DOWNLOAD=false
```

4. Start normally:

```bash
docker compose up -d
```

### Option 2: x64 Emulation (Development Only)

For development on Apple Silicon Macs, you can use Rosetta/QEMU emulation:

```bash
# Build with x64 emulation (slower)
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.dev.yml build
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.dev.yml up
```

::: warning
x64 emulation is significantly slower and not recommended for production.
:::

## Apple Silicon (M1/M2/M3)

### Recommended Setup

1. Download files manually (Option 1 above)
2. Run native ARM64 containers

```bash
# Native ARM64 (fast)
docker compose up -d
```

### Development Setup

For the best development experience on Apple Silicon:

```bash
# 1. Download files on another machine or use a VM
# 2. Place in ./server/ folder
# 3. Run dev environment natively
docker compose -f docker-compose.dev.yml up --build
```

## Raspberry Pi

### Requirements

- Raspberry Pi 4 or newer (4GB+ RAM recommended)
- 64-bit Raspberry Pi OS
- Docker installed

### Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Create project
mkdir ~/hytale && cd ~/hytale

# Download compose file
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example
cp .env.example .env

# Configure (reduce RAM for Pi)
nano .env
```

Recommended Pi configuration:

```env
JAVA_XMS=1G
JAVA_XMX=2G
AUTO_DOWNLOAD=false
```

### Transfer Game Files

From your main computer:

```bash
scp HytaleServer.jar Assets.zip pi@raspberrypi:~/hytale/server/
```

### Start

```bash
docker compose up -d
```

## Troubleshooting

### "exec format error"

This means you're trying to run x64 binaries on ARM64. Solution:
- Use native ARM64 images
- Or enable x64 emulation

### Slow performance with emulation

Expected. For production:
- Use native ARM64
- Download game files manually
- Set `AUTO_DOWNLOAD=false`

### Out of memory

ARM64 devices often have limited RAM:
- Reduce `JAVA_XMX` in `.env`
- Close other applications
- Add swap space if needed
