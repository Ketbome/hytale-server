# Getting Started

## Prerequisites

- Docker and Docker Compose installed
- 4GB+ RAM available per server
- Port 3000/TCP open (panel)
- Port 5520+/UDP open (game servers)

## Installation

### 1. Create project folder

```bash
mkdir hytale && cd hytale
```

### 2. Download configuration files

```bash
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your preferred editor:

```env
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

### 4. Start the panel

```bash
docker compose up -d
```

### 5. Access the panel

Open [http://localhost:3000](http://localhost:3000) in your browser.

Default credentials:
- **User**: `admin`
- **Pass**: `admin`

## Creating Your First Server

1. Log in to the panel
2. Click **"Create Server"**
3. Enter a name (e.g., "My Hytale Server")
4. Configure RAM (recommended: 4G min, 8G max)
5. Click **"Create"**
6. Click **"Enter"** to access the server
7. Go to **Setup** tab and click **"Download Files"**
8. Wait for download (~2GB)
9. Go to **Control** tab and click **"START"**

Your server is now running!

## Multi-Server Setup

You can create multiple servers, each with:
- Different ports (5520, 5521, 5522, ...)
- Different RAM allocations
- Separate mod configurations
- Independent world data

### Port Assignment

Each server needs a unique UDP port. The panel auto-assigns ports starting from 5520.

| Server | Port |
|--------|------|
| Server 1 | 5520/UDP |
| Server 2 | 5521/UDP |
| Server 3 | 5522/UDP |

Make sure to open these ports in your firewall.

## Common Commands

```bash
# View panel logs
docker compose logs -f

# Stop panel
docker compose down

# Update to latest version
docker compose pull && docker compose up -d

# Backup all servers
tar -czvf backup-$(date +%Y%m%d).tar.gz data/
```

## Firewall Configuration

### Linux (UFW)

```bash
# Panel
ufw allow 3000/tcp

# Game servers (adjust range as needed)
ufw allow 5520:5530/udp
```

### Windows

```powershell
# Panel
New-NetFirewallRule -DisplayName "Hytale Panel" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Game servers
New-NetFirewallRule -DisplayName "Hytale Game" -Direction Inbound -Protocol UDP -LocalPort 5520-5530 -Action Allow
```

## Ports Summary

| Service | Port | Protocol |
|---------|------|----------|
| Web Panel | 3000 | TCP |
| Game Server 1 | 5520 | UDP |
| Game Server 2 | 5521 | UDP |
| ... | ... | UDP |

## Next Steps

- [Configure your servers](/guide/configuration)
- [Learn about the web panel](/guide/panel)
- [Install mods](/guide/mods)
- [Troubleshooting](/guide/troubleshooting)
