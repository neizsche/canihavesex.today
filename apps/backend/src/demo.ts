// Shared demo-account config. The demo is a single seeded user (see
// scripts/seedDemo.ts) that visitors can log into from the sign-in screen to
// explore the app with ~6 months of realistic history.

export const DEMO_EMAIL = 'demo@canihavesex.today';

/**
 * Whether the public demo account is offered. Off by default so self-hosters
 * don't expose a shared login unless they opt in. Independent of password auth.
 */
export function isDemoAccountEnabled(): boolean {
  return process.env.ENABLE_DEMO_ACCOUNT === 'true';
}
