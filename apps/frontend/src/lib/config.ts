import { APP_NAME } from './siteConfig';

// Injected at build time by Vite (`define` in astro.config.mjs). Declared here so
// TypeScript knows the global token the bundler will replace.
declare const __APP_VERSION__: string;

export const config = {
  // Client build stamp, sent as x-app-version on API calls (ops telemetry).
  appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',

  // Backend API
  backendBase: (() => {
    const env = import.meta.env as any;
    const base = env.PUBLIC_BACKEND_BASE;

    // Default to production API
    if (!base) {
      // Use relative paths in development as well, since Vite/Astro proxies /api to backend
      return '';
    }

    return String(base).replace(/\/$/, '');
  })(),

  // App settings
  appName: APP_NAME,
  appBase: (() => {
    const env = import.meta.env as any;
    return env.PUBLIC_APP_BASE || 'https://canihavesex.today';
  })(),

  // Development mode
  devMode: import.meta.env.DEV,

  // Environment
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
} as const;

// Log environment information in development
if (config.isDevelopment) {
  console.log('🎨 Frontend running in DEVELOPMENT mode');
  console.log(`   Frontend URL: ${config.appBase}`);
  console.log(`   Backend URL: ${config.backendBase}`);
}
