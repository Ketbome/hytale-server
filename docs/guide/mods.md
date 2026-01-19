# Mods

Hytale Server supports mods to extend gameplay.

## Installing Mods

### Method 1: File Manager (Recommended)

1. Open the web panel
2. Go to **Mods** tab
3. Browse available mods from Modtale
4. Click **Install** on the mod you want

### Method 2: Manual Installation

1. Download mod files (`.jar` or `.zip`)
2. Place them in the `./server/mods/` folder
3. Configure the server to load mods

## Enabling Mods

Add the `--mods` argument to your server configuration:

```env
# .env
SERVER_EXTRA_ARGS=--mods mods
```

Or specify a custom mods folder:

```env
SERVER_EXTRA_ARGS=--mods custom-mods-folder
```

## Custom Mods Folder

You can mount a custom mods folder in `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./my-mods:/opt/hytale/mods
```

## Modtale Integration

[Modtale](https://modtale.com) is a mod repository for Hytale.

### Setup

1. Get an API key from Modtale
2. Add it to your `.env`:

```env
MODTALE_API_KEY=your-api-key-here
```

3. Restart the panel:

```bash
docker compose restart hytale-panel
```

### Features

With Modtale integration:

- Browse mods directly in the panel
- View mod descriptions, authors, and versions
- One-click install and update
- Automatic dependency resolution

## Mod Management Commands

From the server console:

```
/mods list          # List installed mods
/mods reload        # Reload all mods
/mods enable <mod>  # Enable a mod
/mods disable <mod> # Disable a mod
```

## Troubleshooting

### Mods not loading

1. Check `SERVER_EXTRA_ARGS` includes `--mods mods`
2. Verify mods are in the correct folder
3. Check server logs for errors

### Mod compatibility issues

- Check mod version matches server version
- Look for dependency requirements
- Try disabling other mods to isolate the issue

### Performance issues with mods

- Monitor server RAM usage
- Increase `JAVA_XMX` if needed
- Some mods may require more resources
