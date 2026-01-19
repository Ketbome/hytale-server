# Environment Variables

Complete reference of all environment variables.

## Server Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JAVA_XMS` | `4G` | Minimum Java heap size |
| `JAVA_XMX` | `8G` | Maximum Java heap size |
| `BIND_PORT` | `5520` | Game server UDP port |
| `AUTO_DOWNLOAD` | `true` | Auto-download game files on startup |
| `SERVER_EXTRA_ARGS` | - | Additional arguments for the server |
| `TZ` | `UTC` | Container timezone |

## Panel Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PANEL_USER` | `admin` | Login username |
| `PANEL_PASS` | `admin` | Login password |
| `PANEL_PORT` | `3000` | HTTP server port |
| `JWT_SECRET` | (random) | Secret key for JWT signing |
| `MODTALE_API_KEY` | - | API key for Modtale integration |

## Docker Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTAINER_NAME` | `hytale-server` | Name of the game server container |

## Detailed Descriptions

### JAVA_XMS / JAVA_XMX

Controls Java Virtual Machine memory allocation.

```env
# Minimum 4GB, maximum 8GB
JAVA_XMS=4G
JAVA_XMX=8G
```

::: tip RAM Guidelines
| Players | Recommended |
|---------|-------------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |
:::

### AUTO_DOWNLOAD

When `true`, the server will automatically download `HytaleServer.jar` and `Assets.zip` from the official source on first startup.

```env
# Disable for ARM64 or manual setup
AUTO_DOWNLOAD=false
```

::: warning ARM64
Auto-download is **not available on ARM64** systems. Set to `false` and provide files manually.
:::

### SERVER_EXTRA_ARGS

Pass additional arguments to the Hytale server executable.

```env
# Enable mods
SERVER_EXTRA_ARGS=--mods mods

# Multiple arguments
SERVER_EXTRA_ARGS=--mods mods --debug
```

### TZ (Timezone)

Sets the container timezone for log timestamps.

```env
TZ=America/New_York
TZ=Europe/London
TZ=Asia/Tokyo
```

[Full timezone list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### JWT_SECRET

Secret key used to sign JWT tokens. If not provided, a random key is generated on startup.

```env
# Optional but recommended for persistent sessions
JWT_SECRET=your-very-long-random-string-here
```

::: info
If not set, a new random secret is generated each time the panel restarts, invalidating all existing sessions.
:::

### MODTALE_API_KEY

API key for [Modtale](https://modtale.com) mod repository integration.

```env
MODTALE_API_KEY=your-modtale-api-key
```

When configured, enables:
- Mod browsing in the panel
- One-click mod installation
- Update checking

## Example .env File

```env
# ===================
# Server Configuration
# ===================
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520
AUTO_DOWNLOAD=true
SERVER_EXTRA_ARGS=--mods mods
TZ=America/New_York

# ===================
# Panel Configuration
# ===================
PANEL_USER=myadmin
PANEL_PASS=supersecurepassword123
PANEL_PORT=3000
JWT_SECRET=change-this-to-a-random-string

# ===================
# Optional Integrations
# ===================
MODTALE_API_KEY=your-api-key
```
