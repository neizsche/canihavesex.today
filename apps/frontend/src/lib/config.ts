import { APP_NAME } from './siteConfig';

export const config = {
  // Backend API
  backendBase: (() => {
    const env = import.meta.env as any;
    const base = env.PUBLIC_BACKEND_BASE;

    // Default to production API
    if (!base) {
      if (import.meta.env.DEV) {
        return 'http://localhost:1299';
      }
      // Default to /api (proxied through Vercel to Railway)
      return '/api';
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

  // Analytics
  gaTrackingId: (import.meta.env as any).PUBLIC_GA_TRACKING_ID,

  // Environment
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
} as const;

export type Config = typeof config;