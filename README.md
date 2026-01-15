# Hytale Dedicated Server - Docker

Docker image for running a Hytale dedicated server.

## Requirements

- Docker & Docker Compose
- Hytale account (to download server files)
- Minimum 4GB RAM (8GB+ recommended)

## Installation

### Step 1: Create folder and download compose file

```bash
mkdir hytale-server && cd hytale-server
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/hytale-server/main/docker-compose.yml
```

Or manually create `docker-compose.yml` and copy the contents from this repository.

### Step 2: Create directories

**Linux/Mac:**

```bash
mkdir -p server data/universe data/mods data/logs data/config
```

**Windows (PowerShell):**

```powershell
mkdir server, data\universe, data\mods, data\logs, data\config
```

### Step 3: Download server files

Download from your Hytale account and place in `./server/`:

- `HytaleServer.jar`
- `Assets.zip`

### Step 4: Start server

```bash
docker compose up -d
```

### Step 5: Authenticate server (first time only)

```bash
docker attach hytale-server
```

In the console, type:

```
/auth login device
```

Visit the URL shown and enter the code. Once done, detach with `Ctrl+P` + `Ctrl+Q`.

## Server Console

Access the server console:

```bash
docker attach hytale-server
```

Common commands:

```
/auth login device      # Authenticate server
/stop                   # Shutdown server
/save                   # Save world
/whitelist add <user>   # Add player to whitelist
/whitelist remove <user>
/ban <user>             # Ban player
/unban <user>
/op <user>              # Make player operator
/deop <user>
```

Detach without stopping: `Ctrl+P` + `Ctrl+Q`

## Configuration

Edit `docker-compose.yml` to configure the server:

### Memory Settings

| Variable   | Default | Description                     |
| ---------- | ------- | ------------------------------- |
| `JAVA_XMS` | `4G`    | Minimum RAM allocated to server |
| `JAVA_XMX` | `8G`    | Maximum RAM allocated to server |

**Recommended values:**

| Players | JAVA_XMX |
| ------- | -------- |
| 1-10    | 4G       |
| 10-20   | 6G       |
| 20-50   | 8G       |
| 50+     | 12G+     |

### Server Settings

| Variable        | Default   | Description                             |
| --------------- | --------- | --------------------------------------- |
| `BIND_PORT`     | `5520`    | UDP port for player connections         |
| `BIND_ADDR`     | `0.0.0.0` | IP address to bind (0.0.0.0 = all)      |
| `VIEW_DISTANCE` | -         | Render distance in chunks (affects RAM) |
| `MAX_PLAYERS`   | -         | Maximum concurrent players              |
| `SERVER_NAME`   | -         | Server name shown to players            |

### JVM Tuning (Advanced)

| Variable                  | Default | Description                    |
| ------------------------- | ------- | ------------------------------ |
| `USE_G1GC`                | `true`  | Use G1 garbage collector       |
| `MAX_GC_PAUSE_MILLIS`     | `200`   | Target GC pause time (ms)      |
| `G1_NEW_SIZE_PERCENT`     | `30`    | G1 young generation min size % |
| `G1_MAX_NEW_SIZE_PERCENT` | `40`    | G1 young generation max size % |
| `G1_HEAP_REGION_SIZE`     | `8M`    | G1 heap region size            |
| `JAVA_EXTRA_FLAGS`        | -       | Additional JVM flags           |
| `SERVER_EXTRA_ARGS`       | -       | Additional server arguments    |

### Example: Small Server

```yaml
environment:
  JAVA_XMS: "2G"
  JAVA_XMX: "4G"
  MAX_PLAYERS: "10"
```

### Example: Large Server

```yaml
environment:
  JAVA_XMS: "8G"
  JAVA_XMX: "16G"
  MAX_PLAYERS: "100"
  VIEW_DISTANCE: "16"
```

## Directory Structure

```
hytale-server/
├── docker-compose.yml
├── server/                 # Server files
│   ├── HytaleServer.jar
│   └── Assets.zip
└── data/                   # Persistent data (don't delete)
    ├── universe/           # World saves
    ├── mods/               # Server mods
    ├── logs/               # Server logs
    └── config/             # Server configuration
```

## Common Operations

### View logs

```bash
docker compose logs -f
```

### Stop server

```bash
docker compose down
```

### Restart server

```bash
docker compose restart
```

### Update image

```bash
docker compose pull
docker compose up -d
```

### Update server files

```bash
docker compose down
# Replace HytaleServer.jar and Assets.zip in ./server/
docker compose up -d
```

### Backup

```bash
docker compose stop
tar -czvf backup.tar.gz data/
docker compose start
```

## Firewall

Open UDP port 5520:

**Linux:**

```bash
ufw allow 5520/udp
```

**Windows:**

```powershell
New-NetFirewallRule -DisplayName "Hytale" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
```

## License

MIT
