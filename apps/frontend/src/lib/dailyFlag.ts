/**
 * Tiny "once per day" flag backed by localStorage. Stores a timestamp and
 * treats the flag as set for 24h after — so a marked key quietly expires a day
 * later. Used to cap the demo waitlist prompt and to give the demo onboarding
 * walkthrough a one-day life. Safe on the server / in private mode (no-ops).
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export function seenWithinDay(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const t = Number(raw);
    return Number.isFinite(t) && Date.now() - t < DAY_MS;
  } catch {
    return false;
  }
}

export function markSeenToday(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore (private mode) */
  }
}
