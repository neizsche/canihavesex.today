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

if (typeof window !== 'undefined') {
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
