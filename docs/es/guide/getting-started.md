# Comenzar

## Requisitos

- Docker y Docker Compose instalados
- 4GB+ de RAM disponible
- Puerto 5520/UDP abierto (juego) y 3000/TCP (panel)

## Instalación

### 1. Crear carpeta del proyecto

```bash
mkdir hytale && cd hytale
```

### 2. Descargar archivos de configuración

```bash
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytale-server/main/.env.example
```

### 3. Configurar entorno

```bash
cp .env.example .env
```

Edita `.env` con tu editor preferido:

```bash
# Servidor
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Autenticación del Panel (¡CÁMBIALOS!)
PANEL_USER=admin
PANEL_PASS=tu_contraseña_segura
JWT_SECRET=cadena-aleatoria-opcional

# Zona horaria
TZ=America/Santiago
```

::: warning
¡Siempre cambia `PANEL_USER` y `PANEL_PASS` antes de desplegar!
:::

### 4. Iniciar el servidor

```bash
docker compose up -d
```

### 5. Acceder al panel

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Credenciales por defecto:
- **Usuario**: `admin`
- **Contraseña**: `admin`

## Comandos Comunes

```bash
# Ver logs
docker compose logs -f

# Detener servidor
docker compose down

# Actualizar a última versión
docker compose pull && docker compose up -d

# Respaldar datos del servidor
docker compose stop
tar -czvf backup.tar.gz server/
docker compose start
```

## Configuración de Firewall

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

## Puertos

| Servicio | Puerto | Protocolo |
|----------|--------|-----------|
| Servidor de Juego | 5520 | UDP |
| Panel Web | 3000 | TCP |

## Siguientes Pasos

- [Configurar tu servidor](/es/guide/configuration)
- [Conocer el panel web](/es/guide/panel)
- [Instalar mods](/es/guide/mods)
