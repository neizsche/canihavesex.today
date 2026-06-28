/**
 * Application Configuration & Environment Helpers
 * Centralizes all environmental flags, mode checks (Self-Hosting, Demo Mode, Production/Development),
 * and security-related defaults.
 */

// --- MODE CHECKS ---

/** Whether the application is running in production mode. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Whether the application is running in development mode. */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/** Whether the application is running in test mode. */
export function isTesting(): boolean {
  return process.env.NODE_ENV === 'test';
}

// --- SELF-HOSTING ---

/** Whether the application is running in self-hosted mode. */
export function isSelfHost(): boolean {
  return process.env.SELF_HOST === 'true';
}

/** Whether HTTPS redirection should be bypassed (e.g. for HTTP self-hosting). */
export function shouldBypassHttpsRedirect(): boolean {
  return isSelfHost() || process.env.DISABLE_HTTPS_REDIRECT === 'true';
}

/** Whether secure cookies are required. */
export function isCookieSecureRequired(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  // Default to secure in production, unless self-hosted
  return isProduction() && !isSelfHost();
}

/** Whether password-based registration/login is enabled by default. */
export function isPasswordAuthDefaultEnabled(): boolean {
  return isSelfHost();
}

// --- DEMO MODE ---

export const DEMO_EMAIL = 'demo@canihavesex.today';

/** Whether the public demo account is offered. */
export function isDemoAccountEnabled(): boolean {
  return process.env.ENABLE_DEMO_ACCOUNT === 'true';
}
