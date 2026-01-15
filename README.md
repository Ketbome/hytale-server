# Hytale Dedicated Server - Docker

Docker image for Hytale dedicated server with web panel and auto-download.

![Panel Preview](docs/images/panel.png)

## Quick Start

```bash
# 1. Create folder
mkdir hytale && cd hytale

# 2. Download compose file
curl -O https://raw.githubusercontent.com/ketbom/hytale-server/main/docker-compose.yml

# 3. Create data folders
mkdir -p server data/universe data/mods data/logs data/config

# 4. Start everything
docker compose up -d

# 5. Open panel
# http://localhost:3000
```

The server will automatically try to download the game files. If authentication is required, check the panel for instructions.

## Manual Download (Alternative)

If auto-download doesn't work, download from https://hytale.com and place in `./server/`:

- `HytaleServer.jar`
- `Assets.zip`

## Web Panel

Access at **http://localhost:3000**

- 📜 Real-time logs
- ⌨️ Send commands
- 🔐 One-click auth
- 📊 Server status

## Configuration

Edit `docker-compose.yml`:

| Variable        | Default | Description     |
| --------------- | ------- | --------------- |
| `JAVA_XMS`      | `4G`    | Minimum RAM     |
| `JAVA_XMX`      | `8G`    | Maximum RAM     |
| `AUTO_DOWNLOAD` | `true`  | Auto-download   |
| `BIND_PORT`     | `5520`  | UDP port        |
| `VIEW_DISTANCE` | -       | Render distance |
| `MAX_PLAYERS`   | -       | Max players     |
| `SERVER_NAME`   | -       | Server name     |

### RAM Guide

| Players | JAVA_XMX |
| ------- | -------- |
| 1-10    | 4G       |
| 10-20   | 6G       |
| 20-50   | 8G       |
| 50+     | 12G+     |

## Commands

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Update
docker compose pull && docker compose up -d

# Backup
docker compose stop
tar -czvf backup.tar.gz data/
docker compose start
```

## Firewall

```bash
# Linux
ufw allow 5520/udp

# Windows
New-NetFirewallRule -DisplayName "Hytale" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
```

## Ports

| Service | Port     |
| ------- | -------- |
| Server  | 5520/UDP |
| Panel   | 3000/TCP |

## License

MIT
