// Minimal store around the PWA `beforeinstallprompt` event.
//
// The event itself is captured by an inline script in AppLayout (so it isn't
// lost before the JS bundle loads) and stashed on `window.__deferredInstallPrompt`.
// This module exposes a subscribable view of it so React can read it via
// `useSyncExternalStore` — see `useInstallPrompt`.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

// How long after a standalone (installed-PWA) launch we keep treating the user
// as "installed" — even when they later open the site in a regular browser tab
// that shares the same origin storage (e.g. Android Chrome). Avoids nagging an
// existing PWA user with the install affordance.
const RECENT_PWA_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const PWA_LAST_USE_KEY = 'pwa:lastStandaloneUseAt';

/** True when the page is running as an installed PWA (standalone display). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari exposes installed state here instead of via display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Record that the app was just opened from the installed PWA. */
function recordStandaloneUsage(): void {
  if (typeof window === 'undefined' || !isStandaloneDisplay()) return;
  try {
    window.localStorage.setItem(PWA_LAST_USE_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable (private mode, blocked) — ignore.
  }
}

/** Whether the PWA was launched within the recent-use window (default 30 days). */
export function usedPwaRecently(windowMs = RECENT_PWA_WINDOW_MS): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PWA_LAST_USE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at <= windowMs;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  recordStandaloneUsage();
  // The inline capture script dispatches this once the prompt is available.
  window.addEventListener('pwa:installable', emit);
  window.addEventListener('appinstalled', () => {
    window.__deferredInstallPrompt = null;
    emit();
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return window.__deferredInstallPrompt ?? null;
}

/**
 * Trigger the native install prompt. The browser only allows a deferred prompt
 * to be used once, so it is cleared afterwards regardless of the outcome.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = getDeferredPrompt();
  if (!event) return 'unavailable';
  await event.prompt();
  const choice = await event.userChoice;
  if (typeof window !== 'undefined') window.__deferredInstallPrompt = null;
  emit();
  return choice.outcome;
}
