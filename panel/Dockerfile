# Production Dockerfile with pnpm
FROM node:25-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Build frontend
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install
COPY frontend/ ./
COPY tsconfig.base.json ../
RUN pnpm build

# Build backend
FROM base AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install
COPY backend/ ./
COPY tsconfig.base.json ../
RUN pnpm build

# Install production backend dependencies
FROM base AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --prod

# Final production image
FROM node:25-alpine
WORKDIR /app

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=frontend-build /app/public-dist ./public-dist
COPY backend/package.json ./backend/

ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "dist/server.js"]
