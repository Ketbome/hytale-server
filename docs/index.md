---
layout: home

head:
  - - meta
    - name: description
      content: Docker image for Hytale dedicated server with web admin panel, auto-download, JWT authentication, and mod support.
  - - meta
    - name: keywords
      content: hytale server, docker, dedicated server, game server, web panel, mods

hero:
  name: HytalePanel
  text: Docker + Web Panel
  tagline: Run your Hytale dedicated server with auto-download, JWT auth, and a beautiful admin panel.
  image:
    src: /images/hytale.png
    alt: HytalePanel Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/ketbome/hytalepanel

features:
  - icon: 🐳
    title: Docker Ready
    details: One command to run. No manual setup required.
  - icon: 📜
    title: Real-time Console
    details: View logs and send commands directly from the web panel.
  - icon: 🔐
    title: JWT Authentication
    details: Secure access with username/password authentication.
  - icon: 📁
    title: File Manager
    details: Upload, edit, and delete server files from your browser.
  - icon: 🔧
    title: Mod Manager
    details: Install and manage mods with Modtale integration.
  - icon: 🌍
    title: Multi-language
    details: Available in English, Spanish, and Ukrainian.
---

## Quick Start

```bash
# 1. Create folder
mkdir hytale && cd hytale

# 2. Download files
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example

# 3. Configure
cp .env.example .env
nano .env  # Change PANEL_USER and PANEL_PASS!

# 4. Start
docker compose up -d

# 5. Open panel at http://localhost:3000
```
