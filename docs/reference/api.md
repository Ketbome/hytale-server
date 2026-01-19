# REST API Reference

The panel exposes a REST API for file operations.

## Authentication

All API endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <token>
```

Get a token by logging in through the auth endpoints.

## Auth Endpoints

### POST /auth/login

Authenticate and receive a JWT token.

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

**Errors:**

| Status | Error |
|--------|-------|
| 401 | Invalid credentials |

### POST /auth/logout

Invalidate the current session.

**Response:**

```json
{
  "success": true
}
```

### GET /auth/status

Check if the current token is valid.

**Response:**

```json
{
  "authenticated": true,
  "user": "admin"
}
```

## File Endpoints

### POST /api/files/upload

Upload a file to the server.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file`: The file to upload
  - `targetDir`: Target directory path (optional, defaults to `/`)

**Response:**

```json
{
  "success": true,
  "path": "/mods/my-mod.jar"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| 400 | No file provided |
| 413 | File too large (max 100MB) |
| 500 | Server error |

**Example (curl):**

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@my-mod.jar" \
  -F "targetDir=/mods" \
  http://localhost:3000/api/files/upload
```

### GET /api/files/download

Download a file or directory as a tar archive.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to file or directory |

**Response:**

- Content-Type: `application/x-tar`
- Content-Disposition: `attachment; filename="<name>.tar"`

**Errors:**

| Status | Error |
|--------|-------|
| 400 | Path required |
| 404 | File not found |
| 500 | Server error |

**Example (curl):**

```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/files/download?path=/config.json" \
  -o config.tar
```

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider using a reverse proxy (nginx, Traefik) with rate limiting for production deployments.

## CORS

CORS is enabled for the frontend origin. For custom integrations, configure your reverse proxy accordingly.
