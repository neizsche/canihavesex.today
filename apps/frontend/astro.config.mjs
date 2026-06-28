import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';

// Hosting platform detection (GCP Cloud Run and production domains only)
const allowedHosts = isProduction ? [
  'canihavesex.today',
  'www.canihavesex.today',
  'app.canihavesex.today',
  'localhost',
  '.run.app', // GCP Cloud Run
] : true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load `.env` from the repo root so frontend + backend share one config file.
const envDir = path.resolve(__dirname, '../..');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, envDir, '');
const frontendPort = Number(env.FRONTEND_PORT || 3000);
const frontendPreviewPort = Number(env.FRONTEND_PREVIEW_PORT || frontendPort);

const isSelfHost = env.SELF_HOST === 'true';
const sentryDsn = env.SENTRY_DSN;

const integrations = [react(), sitemap()];

if (sentryDsn && !isSelfHost) {
  integrations.push(
    sentry({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
    })
  );
}

export default defineConfig({
  site: 'https://canihavesex.today',
  output: 'static',
  integrations,
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
          target: 'http://127.0.0.1:1299',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      // Dev only: Vite serves files in `public/` with `Cache-Control: no-cache`,
      // which forces the browser to revalidate static images (e.g. the logo
      // shown on many screens) on every component remount — causing a visible
      // blink. Give image assets a real max-age in dev so they stay cached.
      // (Production caching is handled by the backend's static file server.)
      {
        name: 'cache-static-images-dev',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && /\.(png|jpe?g|svg|webp|ico|gif)(\?.*)?$/i.test(req.url)) {
              res.setHeader('Cache-Control', 'public, max-age=86400');
              // Stop Vite's static handler from overwriting the header back to
              // no-cache once it serves the file.
              const setHeader = res.setHeader.bind(res);
              res.setHeader = (name, value) =>
                /^cache-control$/i.test(name) ? res : setHeader(name, value);
            }
            next();
          });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        // Precache shared icons (logo + the install-card app icon) so the
        // installed PWA renders them instantly from cache across screens
        // instead of re-fetching each time.
        includeAssets: ['icon.svg', 'offline.html', 'logo.png', 'apple-touch-icon.png'],
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
          cleanupOutdatedCaches: true,
          // Immediately activate new service workers so stale cached resources
          // from a previous deployment are replaced without requiring the user
          // to close every tab first.
          skipWaiting: true,
          clientsClaim: true,
          // Page navigations go to the network; when the network is
          // unreachable we serve the precached offline screen instead of a
          // blank/broken page. (The HTML shells are emitted by Astro, not
          // Vite, so they aren't in the precache — hence network-first-with-
          // fallback rather than navigateFallback.)
          //
          // Scope this to same-origin GET navigations that aren't API calls.
          // OAuth/API endpoints (e.g. /api/auth/oauth/google/start) are reached
          // via full-page `location.href` navigations and then 302-redirect
          // cross-origin; if the service worker intercepts and re-fetches those,
          // the redirected response can't be rendered as a top-level navigation
          // and the page hangs ("application not found"). Letting them fall
          // through to the browser preserves the native redirect handling.
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === 'navigate' &&
                request.method === 'GET' &&
                url.origin === self.location.origin &&
                !url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
              options: {
                plugins: [
                  {
                    handlerDidError: async () =>
                      (await caches.match('/offline.html', {
                        ignoreSearch: true,
                      })) ?? Response.error(),
                  },
                ],
              },
            },
          ],
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
