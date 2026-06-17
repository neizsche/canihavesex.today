import { APP_NAME } from './siteConfig';

export const config = {
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
