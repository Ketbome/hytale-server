# Configuración

Toda la configuración se realiza mediante variables de entorno en tu archivo `.env`.

## Configuración del Servidor

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `JAVA_XMS` | `4G` | Asignación mínima de RAM |
| `JAVA_XMX` | `8G` | Asignación máxima de RAM |
| `BIND_PORT` | `5520` | Puerto UDP del servidor |
| `AUTO_DOWNLOAD` | `true` | Descarga automática (solo x64) |
| `SERVER_EXTRA_ARGS` | - | Argumentos extra para el servidor |
| `TZ` | `UTC` | Zona horaria para logs |

## Configuración del Panel

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PANEL_USER` | `admin` | Usuario de login |
| `PANEL_PASS` | `admin` | Contraseña de login |
| `PANEL_PORT` | `3000` | Puerto HTTP del panel |
| `JWT_SECRET` | (aleatorio) | Clave de firma JWT |
| `MODTALE_API_KEY` | - | API key para Modtale |

## Guía de RAM

| Jugadores | `JAVA_XMX` Recomendado |
|-----------|------------------------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |

## Ejemplo de Configuración

```bash
# Recursos del Servidor
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Descarga automática
AUTO_DOWNLOAD=true

# Argumentos extra (ej. para mods)
SERVER_EXTRA_ARGS=--mods mods

# Autenticación del Panel
PANEL_USER=miadmin
PANEL_PASS=contraseñasupersegura123
JWT_SECRET=mi-clave-secreta-aleatoria

# Zona horaria
TZ=Europe/Madrid

# Integración Modtale (opcional)
MODTALE_API_KEY=tu-api-key
```

## Personalización de Docker Compose

Puedes personalizar volúmenes y puertos en `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./mis-mods:/opt/hytale/mods
    ports:
      - "5520:5520/udp"
    environment:
      - JAVA_XMX=16G

  hytale-panel:
    ports:
      - "8080:3000"  # Cambiar puerto del panel a 8080
```

## Zonas Horarias Comunes

| Región | Zona Horaria |
|--------|--------------|
| España | `Europe/Madrid` |
| México | `America/Mexico_City` |
| Argentina | `America/Buenos_Aires` |
| Colombia | `America/Bogota` |
| Chile | `America/Santiago` |

[Lista completa de zonas horarias](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
