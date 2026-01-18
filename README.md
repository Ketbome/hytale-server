# Hytale Dedicated Server - Docker

Docker image for Hytale dedicated server with web panel, auto-download, and JWT authentication.

![Panel Preview](docs/images/panel.png)

## Quick Start

```bash
# 1. Create folder
mkdir hytale && cd hytale

# 2. Download files
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/.env.example

# 3. Configure
cp .env.example .env
nano .env  # Change PANEL_USER and PANEL_PASS!

# 4. Start
docker compose up -d

# 5. Open panel
# http://localhost:3000
```

## Authentication

The panel requires login. Default credentials:
- **User**: `admin`
- **Pass**: `admin`

⚠️ **Change these in your `.env` file before deploying!**

```env
PANEL_USER=your_username
PANEL_PASS=your_secure_password
```

## Configuration

Copy `.env.example` to `.env` and edit:

```env
# Server
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Panel Auth
PANEL_USER=admin
PANEL_PASS=admin
JWT_SECRET=optional-random-string

# Timezone (for correct log timestamps)
TZ=America/New_York
```

### All Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `UTC` | Timezone for logs ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `JAVA_XMS` | `4G` | Minimum RAM |
| `JAVA_XMX` | `8G` | Maximum RAM |
| `BIND_PORT` | `5520` | Game UDP port |
| `AUTO_DOWNLOAD` | `true` | Auto-download game |
| `PANEL_USER` | `admin` | Panel username |
| `PANEL_PASS` | `admin` | Panel password |
| `PANEL_PORT` | `3000` | Panel HTTP port |

### RAM Guide

| Players | JAVA_XMX |
|---------|----------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |

## Web Panel Features

- 📜 Real-time console logs
- ⌨️ Send server commands
- 🔐 JWT authentication
- 📁 File manager (upload, edit, delete)
- 🌍 Multi-language (EN/ES/UK)
- 📊 Server status & uptime

## Manual Download

If auto-download fails, get files from https://hytale.com and place in `./server/`:
- `HytaleServer.jar`
- `Assets.zip`

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
tar -czvf backup.tar.gz server/
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

| Service | Port |
|---------|------|
| Game | 5520/UDP |
| Panel | 3000/TCP |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

**Free for personal and non-commercial use.**

Commercial use by companies with >$100k revenue requires permission. See [LICENSE](LICENSE).

---

*This project is not affiliated with Hypixel Studios or Hytale.*
