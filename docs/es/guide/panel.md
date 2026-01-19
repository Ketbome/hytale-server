# Panel Web

El panel web proporciona una interfaz completa para administrar tu servidor de Hytale.

![Vista del Panel](/images/panel.png)

## Características

### Consola en Tiempo Real

- Ve los logs del servidor en tiempo real via WebSocket
- Salida con colores para diferentes niveles de log
- Auto-scroll con opción de pausa

### Entrada de Comandos

Envía comandos directamente a la consola del servidor. Ejemplos:

```
/help
/list
/stop
```

### Gestor de Archivos

- **Navegar** archivos y carpetas del servidor
- **Subir** archivos directamente desde tu navegador
- **Editar** archivos de texto (configs, scripts)
- **Eliminar** archivos y carpetas
- **Descargar** archivos a tu computadora

::: tip
El gestor de archivos está restringido al directorio `/opt/hytale` por seguridad.
:::

### Control del Servidor

- **Iniciar** el servidor
- **Detener** graciosamente
- **Reiniciar** con un click
- Ver **uptime** y **estado**

### Gestor de Mods

- Explorar mods desde Modtale
- Instalación con un click
- Habilitar/deshabilitar mods
- Ver detalles y dependencias

Requiere configurar `MODTALE_API_KEY`.

## Autenticación

El panel usa JWT (JSON Web Tokens) para autenticación.

- Los tokens expiran después de 24 horas
- Se almacenan en localStorage del navegador

### Cambiar Credenciales

Edita tu archivo `.env`:

```bash
PANEL_USER=tu_usuario
PANEL_PASS=tu_contraseña_segura
```

Luego reinicia el panel:

```bash
docker compose restart hytale-panel
```

## Soporte Multi-idioma

El panel soporta múltiples idiomas:

- 🇺🇸 Inglés
- 🇪🇸 Español
- 🇺🇦 Ucraniano

El idioma se detecta automáticamente desde la configuración de tu navegador.

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Enter` | Enviar comando |
| `↑` / `↓` | Navegar historial de comandos |
| `Ctrl+L` | Limpiar consola |

## Consideraciones de Seguridad

::: danger
Nunca expongas el panel a internet sin medidas de seguridad:

1. Usa un **proxy reverso** (nginx, Traefik) con HTTPS
2. Configura reglas de **firewall**
3. Usa **contraseñas fuertes**
4. Considera **VPN** para acceso remoto
:::

### Ejemplo: Proxy Reverso con Nginx

```nginx
server {
    listen 443 ssl;
    server_name hytale.tudominio.com;

    ssl_certificate /ruta/a/cert.pem;
    ssl_certificate_key /ruta/a/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
