import { loadEnv } from './env.js';
import * as Sentry from '@sentry/node';

import { isSelfHost } from './config.js';

// Load environment variables so Sentry can read SENTRY_DSN and SELF_HOST
loadEnv();

const dsn = process.env.SENTRY_DSN;

if (dsn && !isSelfHost()) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
