# Solución de Problemas

Problemas comunes y sus soluciones.

## Autenticación Encriptada (ZimaOS / CasaOS)

### Problema

El comando `/auth persistence Encrypted` falla o no persiste después de reiniciar el contenedor. Esto ocurre porque:

1. ZimaOS/CasaOS no pueden montar `/etc/machine-id:ro` correctamente
2. El contenedor crea un archivo `/etc/machine-id` vacío
3. Sin un machine-id válido, el almacenamiento encriptado de credenciales falla

### Solución

Usa el archivo docker-compose alternativo que no requiere el mount de machine-id:

```bash
# Descargar el compose compatible con CasaOS
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.casaos.yml

# Iniciar con este archivo
docker compose -f docker-compose.casaos.yml up -d
```

El contenedor:
1. Generará un machine-id único en el primer inicio
2. Lo guardará en `./server/.machine-id`
3. Lo restaurará automáticamente en cada reinicio

### Solución Manual (si es necesario)

Si aún tienes problemas, puedes configurar el machine-id manualmente:

```bash
# Entrar al contenedor
docker exec -it hytale-server bash

# Generar y configurar machine-id
dbus-uuidgen > /etc/machine-id

# Verificar
cat /etc/machine-id

# Ahora ejecutar el comando de auth
# /auth persistence Encrypted
```

Luego copia el machine-id a tu carpeta server para persistencia:

```bash
docker exec hytale-server cat /etc/machine-id > ./server/.machine-id
```

## Archivos del Servidor No Encontrados

### Problema

El servidor muestra "Waiting for files..." y no inicia.

### Solución

**Opción 1: Descarga automática (solo x64)**

Asegúrate de que `AUTO_DOWNLOAD=true` en tu archivo `.env`. El descargador requiere autenticación - revisa el panel para prompts de login.

**Opción 2: Descarga manual**

1. Descarga desde [hytale.com](https://hytale.com):
   - `HytaleServer.jar`
   - `Assets.zip`

2. Colócalos en la carpeta `./server/`

3. Reinicia el contenedor

## ARM64: Descarga Automática No Disponible

### Problema

En dispositivos ARM64 (Apple Silicon, Raspberry Pi), la descarga automática no funciona.

### Solución

El binario `hytale-downloader` es solo x64. Descarga los archivos manualmente:

```bash
# En una máquina x64, descarga los archivos
# Luego transfiérelos a tu servidor ARM64:
scp HytaleServer.jar Assets.zip usuario@servidor:~/hytale/server/
```

Ver [Soporte ARM64](/es/guide/arm64) para más detalles.

## El Contenedor Se Reinicia Constantemente

### Problema

El contenedor se reinicia repetidamente sin iniciar el servidor.

### Posibles Causas

1. **RAM insuficiente**: Revisa `JAVA_XMX` en tu `.env`
2. **Archivos faltantes**: Verifica que existan `HytaleServer.jar` y `Assets.zip`
3. **Conflicto de puerto**: Verifica si el puerto 5520/UDP está disponible

### Debug

```bash
# Ver logs
docker compose logs -f hytale

# Ver estado del contenedor
docker ps -a
```

## El Panel No Puede Conectar al Servidor

### Problema

El panel web muestra "Container not found" o no puede controlar el servidor.

### Solución

1. Verifica que el nombre del contenedor coincida:
   ```bash
   # Ver nombre real del contenedor
   docker ps
   
   # Debe coincidir con CONTAINER_NAME en .env (por defecto: hytale-server)
   ```

2. Asegúrate de que el socket de Docker esté montado:
   ```yaml
   # En docker-compose.yml
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock:ro
   ```

3. Verifica que los contenedores estén en la misma red:
   ```bash
   docker network ls
   docker network inspect hytale_default
   ```

## Errores de Permisos

### Problema

No se pueden escribir archivos o el servidor no puede iniciar por permisos.

### Solución

El contenedor se ejecuta como root inicialmente para arreglar permisos, luego cambia al usuario `hytale`. Si tienes problemas:

```bash
# Arreglar permisos manualmente
sudo chown -R 1000:1000 ./server/
```

## Los Mods No Cargan

### Problema

Los mods instalados no aparecen en el juego.

### Solución

1. Verifica que `SERVER_EXTRA_ARGS` incluya el flag de mods:
   ```bash
   SERVER_EXTRA_ARGS=--mods mods
   ```

2. Verifica que los mods estén en la carpeta correcta: `./server/mods/`

3. Reinicia el servidor después de agregar mods

4. Revisa los logs del servidor por errores de carga de mods

## Obtener Ayuda

Si tu problema no está listado aquí:

1. Revisa los [GitHub Issues](https://github.com/ketbome/hytalepanel/issues)
2. Busca issues existentes antes de crear uno nuevo
3. Incluye logs y tu configuración al reportar bugs
