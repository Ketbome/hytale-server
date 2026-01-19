# Getting Started

## Prerequisites

- Docker and Docker Compose installed
- 4GB+ RAM available
- Port 5520/UDP open (game) and 3000/TCP (panel)

## Installation

### 1. Create project folder

```bash
mkdir hytale && cd hytale
```

### 2. Download configuration files

```bash
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/.env.example
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your preferred editor:

```env
# Server
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Panel Auth (CHANGE THESE!)
PANEL_USER=admin
PANEL_PASS=your_secure_password
JWT_SECRET=optional-random-string

# Timezone
TZ=America/New_York
```

::: warning
Always change the default `PANEL_USER` and `PANEL_PASS` before deploying!
:::

### 4. Start the server

```bash
docker compose up -d
```

### 5. Access the panel

Open [http://localhost:3000](http://localhost:3000) in your browser.

Default credentials:
- **User**: `admin`
- **Pass**: `admin`

## Common Commands

```bash
# View logs
docker compose logs -f

# Stop server
docker compose down

# Update to latest version
docker compose pull && docker compose up -d

# Backup server data
docker compose stop
tar -czvf backup.tar.gz server/
docker compose start
```

## Firewall Configuration

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

## Ports

| Service | Port | Protocol |
|---------|------|----------|
| Game Server | 5520 | UDP |
| Web Panel | 3000 | TCP |

## Next Steps

- [Configure your server](/guide/configuration)
- [Learn about the web panel](/guide/panel)
- [Install mods](/guide/mods)
