import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const basePath = process.env.BASE_PATH || '';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    },
    proxy: {
      '/panel-config': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      ...(basePath && {
        [`${basePath}/api`]: {
          target: 'http://localhost:3000',
          changeOrigin: true
        },
        [`${basePath}/auth`]: {
          target: 'http://localhost:3000',
          changeOrigin: true
        },
        [`${basePath}/socket.io`]: {
          target: 'http://localhost:3000',
          ws: true
        },
        [`${basePath}/panel-config`]: {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }),
      // Default routes (no prefix)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  base: './', // Relative paths for assets (works with any BASE_PATH at runtime)
  build: {
    outDir: '../public-dist',
    emptyOutDir: true
  }
});
