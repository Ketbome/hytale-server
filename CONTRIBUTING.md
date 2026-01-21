# Contributing to HytalePanel

## Getting Started

```bash
# Clone
git clone https://github.com/ketbome/hytalepanel.git
cd hytalepanel

# Copy env
cp .env.example .env

# Build and run
docker-compose -f docker-compose.dev.yml up --build
```

## Project Structure

```
hytale/
├── panel/                    # Web panel (Node.js)
│   ├── src/                  # Refactored source
│   │   ├── config/          # Configuration
│   │   ├── middleware/      # Express/Socket middleware
│   │   ├── routes/          # HTTP routes
│   │   ├── services/        # Business logic
│   │   ├── socket/          # WebSocket handlers
│   │   └── server.js        # Entry point
│   └── public/              # Frontend assets
│       ├── css/             # Styles
│       └── js/              # Modules
├── server/                   # Hytale server files (gitignored)
├── docker-compose.yml        # Production
├── docker-compose.dev.yml    # Development
└── Dockerfile               # Server image
```

## Commits

Use conventional commits:

```
feat: add new feature
fix: bug fix
refactor: code refactor
docs: documentation
chore: maintenance
```

## Pull Requests

1. Fork the repo
2. Create feature branch: `git checkout -b feat/my-feature`
3. Commit changes
4. Push: `git push origin feat/my-feature`
5. Open PR

## Code Style

- **Backend**: Node.js, no TypeScript, simple and readable
- **Frontend**: Vanilla JS, no frameworks, modular
- **Naming**: `camelCase` for variables, `PascalCase` for classes
- **Comments**: Only for complex logic, not obvious code

## Testing

```bash
# Run panel locally
cd panel
npm install
npm start

# Test with Docker
docker-compose -f docker-compose.dev.yml up --build
```

## Adding Translations

Edit `panel/public/js/i18n.js`:

```javascript
const translations = {
  en: { ... },
  es: { ... },
  // Add your language
  fr: {
    serverPanel: 'Panneau de Serveur',
    // ...
  }
};
```

Add option in `panel/public/index.html`:

```html
<select id="lang-select">
  <option value="fr">Français</option>
</select>
```

## Questions?

Open an issue on GitHub.
