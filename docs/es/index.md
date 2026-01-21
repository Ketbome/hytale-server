---
layout: home

head:
  - - meta
    - name: description
      content: Imagen Docker para servidor dedicado de Hytale con panel web, descarga automática, autenticación JWT y soporte de mods.
  - - meta
    - name: keywords
      content: hytale servidor, docker, servidor dedicado, panel web, mods

hero:
  name: HytalePanel
  text: Docker + Panel Web
  tagline: Ejecuta tu servidor dedicado de Hytale con descarga automática, autenticación JWT y un panel de administración.
  image:
    src: /images/hytale.png
    alt: HytalePanel Logo
  actions:
    - theme: brand
      text: Comenzar
      link: /es/guide/getting-started
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/ketbome/hytalepanel

features:
  - icon: 🐳
    title: Listo para Docker
    details: Un comando para ejecutar. Sin configuración manual.
  - icon: 📜
    title: Consola en Tiempo Real
    details: Ve los logs y envía comandos directamente desde el panel web.
  - icon: 🔐
    title: Autenticación JWT
    details: Acceso seguro con autenticación de usuario y contraseña.
  - icon: 📁
    title: Gestor de Archivos
    details: Sube, edita y elimina archivos del servidor desde tu navegador.
  - icon: 🔧
    title: Gestor de Mods
    details: Instala y gestiona mods con integración de Modtale.
  - icon: 🌍
    title: Multi-idioma
    details: Disponible en inglés, español y ucraniano.
---

## Inicio Rápido

```bash
# 1. Crear carpeta
mkdir hytale && cd hytale

# 2. Descargar archivos
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example

# 3. Configurar
cp .env.example .env
nano .env  # ¡Cambia PANEL_USER y PANEL_PASS!

# 4. Iniciar
docker compose up -d

# 5. Abrir panel en http://localhost:3000
```
