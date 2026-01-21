# Web Panel

The web panel provides a complete interface to manage multiple Hytale servers from a single dashboard.

![Panel Preview](/images/panel.png)

## Multi-Server Dashboard

The main dashboard displays all your servers with their current status.

### Server Cards

Each server shows:
- **Name** - Custom server name
- **Status** - Online (green) or Offline (red)
- **Actions**:
  - **Enter** - Access server management
  - **Delete** - Remove server and data

### Creating a Server

1. Click **"Create Server"** button
2. Fill in the configuration:
   - **Server Name** - A friendly name for your server
   - **Port** - UDP port (auto-assigned if not specified)
   - **Min RAM / Max RAM** - Java heap size (e.g., 4G, 8G)
   - **Linux Native** - Enable for Linux hosts, disable for CasaOS/Windows
3. Click **"Create"**

The server is created with its own:
- Docker container
- Data directory
- Configuration files

## Server Management

After entering a server, you have access to several tabs:

### Console

- Real-time server logs via WebSocket
- Color-coded output for different log levels
- Auto-scroll with pause option
- Command input to send commands to the server

::: tip
Commands are disabled when the server is offline.
:::

### Setup Tab

Manage game file downloads and authentication:

- **Download Status** - Shows if game files are present
- **Download Button** - Downloads HytaleServer.jar and Assets.zip (~2GB)
- **Authentication** - Device OAuth flow for Hytale authentication

### Files Tab

Full file manager for the server's data directory:

- **Browse** - Navigate folders
- **Upload** - Drag & drop or click to upload files (max 500MB)
- **Edit** - Inline text editor for configs
- **Delete** - Remove files and folders
- **Download** - Download files as .tar

::: warning
File operations require the server to be running.
:::

### Mods Tab

Manage server mods with Modtale integration:

- **Browse** - Search Modtale catalog
- **Install** - One-click mod installation
- **Local** - View installed mods
- **Enable/Disable** - Toggle mods without removing
- **Updates** - Check for mod updates

Requires `MODTALE_API_KEY` environment variable.

### Commands Tab

Quick reference and buttons for common server commands:

```
/help              - Show all commands
/list              - List connected players
/auth login device - Start OAuth authentication
/auth status       - Check auth status
/stop              - Stop the server
```

### Control Tab

Server lifecycle management:

| Button | Action |
|--------|--------|
| **START** | Start the server container |
| **RESTART** | Restart the server |
| **STOP** | Gracefully stop the server |
| **WIPE DATA** | Delete all server data (requires confirmation) |

### Config Tab

Edit server configuration without touching YAML files:

| Setting | Description |
|---------|-------------|
| **Port** | UDP game port (1024-65535) |
| **Min RAM** | Minimum Java heap (e.g., 2G, 4G) |
| **Max RAM** | Maximum Java heap (e.g., 4G, 8G) |
| **Bind Address** | Network interface (default: 0.0.0.0) |
| **Extra Arguments** | Additional server args (e.g., --world-seed 123) |
| **Auto-download** | Enable automatic game file download |
| **G1GC** | Use G1 garbage collector (recommended) |
| **Linux Native** | Mount machine-id volumes (Linux only) |

::: warning
Configuration can only be edited when the server is stopped. Restart the server to apply changes.
:::

## Authentication

The panel uses JWT (JSON Web Tokens) for authentication.

- Tokens expire after 24 hours
- Stored in browser localStorage

### Changing Credentials

Edit your `.env` file:

```env
PANEL_USER=your_username
PANEL_PASS=your_secure_password
```

Then restart the panel:

```bash
docker compose restart
```

## Multi-language Support

The panel supports multiple languages:

- 🇺🇸 English
- 🇪🇸 Spanish
- 🇺🇦 Ukrainian

Language is auto-detected from your browser settings.

## Data Structure

Each server's data is stored independently:

```
data/panel/
├── servers.json          # Server registry and configs
└── servers/
    └── {server-id}/
        ├── docker-compose.yml  # Auto-generated
        └── server/
            ├── HytaleServer.jar
            ├── Assets.zip
            ├── universe/       # World data
            ├── mods/           # Server mods
            └── logs/           # Server logs
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send command |
| `↑` / `↓` | Navigate command history |

## Security Considerations

::: danger
Never expose the panel to the internet without proper security:

1. Use a **reverse proxy** (nginx, Traefik) with HTTPS
2. Enable **firewall** rules to restrict access
3. Use **strong passwords**
4. Consider **VPN** for remote access
:::

### Example: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name hytale.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Troubleshooting

### "No space left on device" on Windows/Docker Desktop

This is a known Docker Desktop bug. Fix:

1. Run `wsl --shutdown` in PowerShell
2. Restart Docker Desktop
3. Try again

### Server won't start

Check the server logs for errors. Common issues:
- Port already in use - change the port in Config tab
- Missing game files - use Setup tab to download
- Insufficient RAM - increase Max RAM in Config tab

### Files tab shows empty

The Files tab requires the server to be running. Start the server first.
