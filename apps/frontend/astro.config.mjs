import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';

// Hosting platform detection
const allowedHosts = isProduction ? [
  'canihavesex.today',
  'www.canihavesex.today',
  'app.canihavesex.today',
  'localhost',
  // Vercel
  '.vercel.app',
  // Netlify
  '.netlify.app',
  '.netlify.dev',
  // Railway
  '.railway.app',
  // Render
  '.onrender.com',
  // Fly.io
  '.fly.dev',
  // Digital Ocean App Platform
  '.ondigitalocean.app',
] : true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load `.env` from the repo root so frontend + backend share one config file.
const envDir = path.resolve(__dirname, '../..');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, envDir, '');
const frontendPort = Number(env.FRONTEND_PORT || 3000);
const frontendPreviewPort = Number(env.FRONTEND_PREVIEW_PORT || frontendPort);

export default defineConfig({
  site: 'https://canihavesex.today',
  output: 'static',
  integrations: [react(), sitemap()],
  devToolbar: {
    enabled: false,
  },
  vite: {
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts,
      proxy: {
        '/api': {
          target: isProduction ? 'https://backend-production-9072.up.railway.app' : 'http://127.0.0.1:1299',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'canihavesex.today',
          short_name: 'canihavesex',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#0b0b0f',
          theme_color: '#0b0b0f',
          icons: [
            {
              src: 'android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            },
          ],
        },
        workbox: {
          navigateFallback: '/',
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  },
  server: {
    host: true,
    allowedHosts,
    port: frontendPort,
  },
  preview: {
    port: frontendPreviewPort,
  },
});
