# Variables de Entorno

Referencia completa de todas las variables de entorno.

## Variables del Servidor

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `JAVA_XMS` | `4G` | Tamaño mínimo del heap de Java |
| `JAVA_XMX` | `8G` | Tamaño máximo del heap de Java |
| `BIND_PORT` | `5520` | Puerto UDP del servidor |
| `AUTO_DOWNLOAD` | `true` | Descarga automática al iniciar |
| `SERVER_EXTRA_ARGS` | - | Argumentos adicionales |
| `TZ` | `UTC` | Zona horaria del contenedor |

## Variables del Panel

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PANEL_USER` | `admin` | Usuario de login |
| `PANEL_PASS` | `admin` | Contraseña de login |
| `PANEL_PORT` | `3000` | Puerto HTTP del servidor |
| `JWT_SECRET` | (aleatorio) | Clave secreta para firmar JWT |
| `MODTALE_API_KEY` | - | API key para integración Modtale |
| `HOST_DATA_PATH` | - | Ruta del host para acceso directo |
| `DISABLE_AUTH` | `false` | Deshabilitar autenticación del panel |
| `BASE_PATH` | - | Prefijo de ruta URL (ej: `/panel`) |

## Variables de Docker

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `CONTAINER_NAME` | `hytale-server` | Nombre del contenedor del servidor |

## Descripciones Detalladas

### JAVA_XMS / JAVA_XMX

Controla la asignación de memoria de la JVM.

```bash
# Mínimo 4GB, máximo 8GB
JAVA_XMS=4G
JAVA_XMX=8G
```

::: tip Guía de RAM
| Jugadores | Recomendado |
|-----------|-------------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |
:::

### AUTO_DOWNLOAD

Cuando es `true`, el servidor descargará automáticamente `HytaleServer.jar` y `Assets.zip` al iniciar por primera vez.

```bash
# Deshabilitar para ARM64 o configuración manual
AUTO_DOWNLOAD=false
```

::: warning ARM64
La descarga automática **no está disponible en ARM64**. Configura `false` y proporciona los archivos manualmente.
:::

### SERVER_EXTRA_ARGS

Pasa argumentos adicionales al ejecutable del servidor.

```bash
# Habilitar mods
SERVER_EXTRA_ARGS=--mods mods

# Múltiples argumentos
SERVER_EXTRA_ARGS=--mods mods --debug
```

### TZ (Zona Horaria)

Configura la zona horaria del contenedor para timestamps de logs.

```bash
TZ=America/Santiago
TZ=Europe/Madrid
TZ=America/Mexico_City
```

[Lista completa de zonas horarias](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### JWT_SECRET

Clave secreta usada para firmar tokens JWT. Si no se proporciona, se genera una clave aleatoria al iniciar.

```bash
# Opcional pero recomendado para sesiones persistentes
JWT_SECRET=tu-cadena-aleatoria-muy-larga-aqui
```

::: info
Si no está configurado, se genera un nuevo secreto cada vez que el panel reinicia, invalidando todas las sesiones existentes.
:::

### MODTALE_API_KEY

API key para la integración con el repositorio de mods [Modtale](https://modtale.com).

```bash
MODTALE_API_KEY=tu-modtale-api-key
```

Cuando está configurado, habilita:
- Exploración de mods en el panel
- Instalación de mods con un click
- Verificación de actualizaciones

### HOST_DATA_PATH

Ruta en el sistema de archivos del host donde se almacenarán los datos del panel. Cuando está configurado, los servidores usan bind mounts absolutos en lugar de volúmenes Docker.

```bash
HOST_DATA_PATH=/home/user/hytale-data
```

Cuando está configurado:
- Los datos del panel se almacenan en la ruta del host
- Los nuevos servidores usan rutas absolutas: `/home/user/hytale-data/servers/{id}/server:/opt/hytale`
- Los archivos son accesibles directamente desde el host sin usar el panel

::: tip Acceso Directo a Archivos
Útil cuando quieres editar archivos del servidor, subir mods o gestionar mundos directamente desde el sistema de archivos del host en lugar del panel web.
:::

### DISABLE_AUTH

Deshabilita completamente la autenticación del panel. Usa esto cuando la autenticación es manejada por un reverse proxy con SSO (Authentik, Authelia, etc.).

```bash
DISABLE_AUTH=true
```

::: warning Seguridad
Solo habilita esto detrás de un reverse proxy correctamente configurado con autenticación. El panel será totalmente accesible sin login.
:::

El panel también soporta headers **HTTP Basic Auth**. Si tu SSO/reverse proxy inyecta headers `Authorization: Basic ...` con credenciales válidas, el panel los aceptará sin requerir login separado.

### BASE_PATH

Prefijo de ruta URL para montar el panel en una ubicación personalizada. Útil cuando ejecutas múltiples servicios en el mismo dominio.

```bash
BASE_PATH=/panel
```

Cuando está configurado:
- Panel accesible en `https://dominio.com/panel/` en lugar de la raíz
- Todas las rutas API con prefijo: `/panel/api/`, `/panel/auth/`
- Path de Socket.IO: `/panel/socket.io`

::: tip Reverse Proxy
Configura tu reverse proxy (Nginx, Caddy, Traefik) para reenviar peticiones de `/panel/` al contenedor del panel.
:::

## Ejemplo de Archivo .env

```bash
# ===================
# Configuración del Servidor
# ===================
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520
AUTO_DOWNLOAD=true
SERVER_EXTRA_ARGS=--mods mods
TZ=America/Santiago

# ===================
# Configuración del Panel
# ===================
PANEL_USER=miadmin
PANEL_PASS=contraseñasupersegura123
PANEL_PORT=3000
JWT_SECRET=cambia-esto-a-una-cadena-aleatoria

# ===================
# Integraciones Opcionales
# ===================
MODTALE_API_KEY=tu-api-key

# ===================
# Almacenamiento de Datos
# ===================
# Descomentar para almacenar datos en el host en lugar de volumen Docker
# HOST_DATA_PATH=/home/user/hytale-data
```
