# Troubleshooting

Common issues and solutions.

## Encrypted Authentication (ZimaOS / CasaOS)

### Problem

The `/auth persistence Encrypted` command fails or doesn't persist after container restart. This happens because:

1. ZimaOS/CasaOS can't mount `/etc/machine-id:ro` properly
2. The container creates an empty `/etc/machine-id` file
3. Without a valid machine-id, encrypted credential storage fails

### Solution

Use the alternative docker-compose file that doesn't require the machine-id mount:

```bash
# Download the CasaOS-compatible compose file
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.casaos.yml

# Start with this file
docker compose -f docker-compose.casaos.yml up -d
```

The container will:
1. Generate a unique machine-id on first start
2. Save it to `./server/.machine-id`
3. Restore it automatically on every restart

### Manual Fix (if needed)

If you're still having issues, you can manually set the machine-id:

```bash
# Enter the container
docker exec -it hytale-server bash

# Generate and set machine-id
dbus-uuidgen > /etc/machine-id

# Verify
cat /etc/machine-id

# Now run the auth command
# /auth persistence Encrypted
```

Then copy the machine-id to your server folder for persistence:

```bash
docker exec hytale-server cat /etc/machine-id > ./server/.machine-id
```

## Server Files Not Found

### Problem

The server shows "Waiting for files..." and doesn't start.

### Solution

**Option 1: Auto-download (x64 only)**

Make sure `AUTO_DOWNLOAD=true` in your `.env` file. The downloader requires authentication - check the panel for login prompts.

**Option 2: Manual download**

1. Download from [hytale.com](https://hytale.com):
   - `HytaleServer.jar`
   - `Assets.zip`

2. Place them in `./server/` folder

3. Restart the container

## ARM64: Auto-download Not Available

### Problem

On ARM64 devices (Apple Silicon, Raspberry Pi), auto-download doesn't work.

### Solution

The `hytale-downloader` binary is x64 only. Download files manually:

```bash
# On an x64 machine, download the files
# Then transfer to your ARM64 server:
scp HytaleServer.jar Assets.zip user@server:~/hytale/server/
```

See [ARM64 Support](/guide/arm64) for details.

## Container Keeps Restarting

### Problem

The container restarts repeatedly without starting the server.

### Possible Causes

1. **Not enough RAM**: Check `JAVA_XMX` in your `.env`
2. **Missing files**: Ensure `HytaleServer.jar` and `Assets.zip` exist
3. **Port conflict**: Check if port 5520/UDP is available

### Debug

```bash
# Check logs
docker compose logs -f hytale

# Check container status
docker ps -a
```

## Panel Can't Connect to Server

### Problem

The web panel shows "Container not found" or can't control the server.

### Solution

1. Verify container name matches:
   ```bash
   # Check actual container name
   docker ps
   
   # Should match CONTAINER_NAME in .env (default: hytale-server)
   ```

2. Ensure Docker socket is mounted:
   ```yaml
   # In docker-compose.yml
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock:ro
   ```

3. Check if containers are on the same network:
   ```bash
   docker network ls
   docker network inspect hytale_default
   ```

## Permission Denied Errors

### Problem

Files can't be written or the server can't start due to permissions.

### Solution

The container runs as root initially to fix permissions, then drops to `hytale` user. If you have issues:

```bash
# Fix permissions manually
sudo chown -R 1000:1000 ./server/
```

## Mods Not Loading

### Problem

Installed mods don't appear in-game.

### Solution

1. Verify `SERVER_EXTRA_ARGS` includes mods flag:
   ```bash
   SERVER_EXTRA_ARGS=--mods mods
   ```

2. Check mods are in correct folder: `./server/mods/`

3. Restart the server after adding mods

4. Check server logs for mod loading errors

## Getting Help

If your issue isn't listed here:

1. Check the [GitHub Issues](https://github.com/ketbome/hytalepanel/issues)
2. Search existing issues before creating a new one
3. Include logs and your configuration when reporting bugs
