# Mods

Hytale Server soporta mods para extender la jugabilidad.

## Instalar Mods

### Método 1: Gestor de Archivos (Recomendado)

1. Abre el panel web
2. Ve a la pestaña **Mods**
3. Explora mods disponibles desde Modtale
4. Haz click en **Instalar** en el mod que quieras

### Método 2: Instalación Manual

1. Descarga archivos de mods (`.jar` o `.zip`)
2. Colócalos en la carpeta `./server/mods/`
3. Configura el servidor para cargar mods

## Habilitar Mods

Añade el argumento `--mods` a tu configuración:

```bash
# .env
SERVER_EXTRA_ARGS=--mods mods
```

O especifica una carpeta personalizada:

```bash
SERVER_EXTRA_ARGS=--mods mi-carpeta-mods
```

## Carpeta de Mods Personalizada

Puedes montar una carpeta de mods personalizada en `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./mis-mods:/opt/hytale/mods
```

## Integración con Modtale

[Modtale](https://modtale.com) es un repositorio de mods para Hytale.

### Configuración

1. Obtén una API key de Modtale
2. Añádela a tu `.env`:

```bash
MODTALE_API_KEY=tu-api-key-aqui
```

3. Reinicia el panel:

```bash
docker compose restart hytale-panel
```

### Funcionalidades

Con la integración de Modtale:

- Explora mods directamente en el panel
- Ve descripciones, autores y versiones
- Instalación y actualización con un click
- Resolución automática de dependencias

## Comandos de Gestión de Mods

Desde la consola del servidor:

```
/mods list          # Listar mods instalados
/mods reload        # Recargar todos los mods
/mods enable <mod>  # Habilitar un mod
/mods disable <mod> # Deshabilitar un mod
```

## Solución de Problemas

### Los mods no cargan

1. Verifica que `SERVER_EXTRA_ARGS` incluya `--mods mods`
2. Comprueba que los mods estén en la carpeta correcta
3. Revisa los logs del servidor por errores

### Problemas de compatibilidad

- Verifica que la versión del mod coincida con la del servidor
- Busca requisitos de dependencias
- Prueba deshabilitando otros mods para aislar el problema

### Problemas de rendimiento con mods

- Monitorea el uso de RAM del servidor
- Aumenta `JAVA_XMX` si es necesario
- Algunos mods pueden requerir más recursos
