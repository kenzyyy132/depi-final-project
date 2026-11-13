import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app calls /api on its own origin; Vite forwards it to the API server.
// changeOrigin stays false so the API sees the browser's real Origin/Host (same-origin CSRF check).
const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: API_TARGET, changeOrigin: false } } },
  preview: { proxy: { '/api': { target: API_TARGET, changeOrigin: false } } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    globalSetup: './src/test/global-setup.js',
    css: false,
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 120000,
  },
});
