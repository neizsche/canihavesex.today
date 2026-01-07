import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
  vite: {
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
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
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
  },
});
