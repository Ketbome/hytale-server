# Configuration

All configuration is done through environment variables in your `.env` file.

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JAVA_XMS` | `4G` | Minimum RAM allocation |
| `JAVA_XMX` | `8G` | Maximum RAM allocation |
| `BIND_PORT` | `5520` | Game server UDP port |
| `AUTO_DOWNLOAD` | `true` | Auto-download game files (x64 only) |
| `SERVER_EXTRA_ARGS` | - | Extra arguments for the server |
| `TZ` | `UTC` | Timezone for logs |

## Panel Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PANEL_USER` | `admin` | Panel login username |
| `PANEL_PASS` | `admin` | Panel login password |
| `PANEL_PORT` | `3000` | Panel HTTP port |
| `JWT_SECRET` | (random) | JWT signing key |
| `MODTALE_API_KEY` | - | Modtale API key for mod integration |

## RAM Guidelines

| Players | Recommended `JAVA_XMX` |
|---------|------------------------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |

## Example Configuration

```env
# Server Resources
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Auto-download (set to false if you want to provide files manually)
AUTO_DOWNLOAD=true

# Extra server arguments (e.g., for mods)
SERVER_EXTRA_ARGS=--mods mods

# Panel Authentication
PANEL_USER=myadmin
PANEL_PASS=supersecretpassword123
JWT_SECRET=my-random-secret-key

# Timezone (see: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
TZ=Europe/Madrid

# Modtale integration (optional)
MODTALE_API_KEY=your-api-key-here
```

## Docker Compose Customization

You can customize volumes and ports in `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale          # Server files
      - ./my-custom-mods:/opt/hytale/mods  # Custom mods folder
    ports:
      - "5520:5520/udp"               # Game port
    environment:
      - JAVA_XMX=16G                  # Override RAM

  hytale-panel:
    ports:
      - "8080:3000"                   # Change panel port to 8080
```

## Timezone List

Common timezones:

| Region | Timezone |
|--------|----------|
| US East | `America/New_York` |
| US West | `America/Los_Angeles` |
| UK | `Europe/London` |
| Central Europe | `Europe/Berlin` |
| Spain | `Europe/Madrid` |
| Japan | `Asia/Tokyo` |
| Australia | `Australia/Sydney` |

[Full list of timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
