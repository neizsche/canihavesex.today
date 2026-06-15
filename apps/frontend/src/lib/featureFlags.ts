/**
 * Open-source build: every feature is available to everyone — there is no
 * premium tier. These helpers are kept as no-ops so existing call sites keep
 * working; they always report features as enabled/unlocked.
 */

export function isPremiumEnabled(): boolean {
  return true;
}

export function usePremiumFeatures() {
  return { premiumEnabled: true, isPremium: true };
}

export function isPremiumStatusEnabled(): boolean {
  return true;
}

export function usePremiumStatus() {
  return { isPremium: true };
}
