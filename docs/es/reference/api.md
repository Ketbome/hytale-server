# Referencia de API REST

El panel expone una API REST para operaciones de archivos.

## Autenticación

Todos los endpoints requieren autenticación JWT via el header `Authorization`:

```
Authorization: Bearer <token>
```

Obtén un token iniciando sesión a través de los endpoints de auth.

## Endpoints de Autenticación

### POST /auth/login

Autenticar y recibir un token JWT.

**Request:**

```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbG..."
}
```

**Errores:**

| Status | Error |
|--------|-------|
| 401 | Credenciales inválidas |

### POST /auth/logout

Invalidar la sesión actual.

**Response:**

```json
{
  "success": true
}
```

### GET /auth/status

Verificar si el token actual es válido.

**Response:**

```json
{
  "authenticated": true,
  "user": "admin"
}
```

## Endpoints de Archivos

### POST /api/files/upload

Subir un archivo al servidor.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file`: El archivo a subir
  - `targetDir`: Ruta del directorio destino (opcional, por defecto `/`)

**Response:**

```json
{
  "success": true,
  "path": "/mods/my-mod.jar"
}
```

**Errores:**

| Status | Error |
|--------|-------|
| 400 | No se proporcionó archivo |
| 413 | Archivo muy grande (máx 100MB) |
| 500 | Error del servidor |

**Ejemplo (curl):**

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@mi-mod.jar" \
  -F "targetDir=/mods" \
  http://localhost:3000/api/files/upload
```

### GET /api/files/download

Descargar un archivo o directorio como archivo tar.

**Parámetros de Query:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `path` | string | Sí | Ruta al archivo o directorio |

**Response:**

- Content-Type: `application/x-tar`
- Content-Disposition: `attachment; filename="<nombre>.tar"`

**Errores:**

| Status | Error |
|--------|-------|
| 400 | Se requiere ruta |
| 404 | Archivo no encontrado |
| 500 | Error del servidor |

**Ejemplo (curl):**

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/download?path=/config.json" \
  -o config.tar
```

## Formato de Respuesta de Error

Todos los errores siguen este formato:

```json
{
  "success": false,
  "error": "Mensaje de error aquí"
}
```

## Rate Limiting

Actualmente no hay rate limiting implementado. Considera usar un proxy reverso (nginx, Traefik) con rate limiting para despliegues en producción.

## CORS

CORS está habilitado para el origen del frontend. Para integraciones personalizadas, configura tu proxy reverso apropiadamente.
