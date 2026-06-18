import * as React from 'react';

import { useInstallPrompt } from './useInstallPrompt';

// Set by the early inline script in AppLayout when the landing page links here
// with `?install=1`. Persisted (rather than read from the URL) so it survives
// the sign-in + onboarding flow a first-time user goes through before the app
// proper mounts. The apex domain can't install the PWA, so it has to fire here.
const INTENT_KEY = 'pwa-install-intent';
// How long to wait for Chrome to deliver `beforeinstallprompt` before falling
// back to the manual install card in Settings.
const PROMPT_WAIT_MS = 3000;

function hasInstallIntent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(INTENT_KEY) === '1';
  } catch {
    return false;
  }
}

function clearInstallIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Bridges the landing-page "Get the app" CTA into the native install flow.
 *
 * When the app is opened with `?install=1`, auto-fire the Android install
 * prompt as soon as the deferred event is available. If the browser never
 * surfaces a native prompt (heuristics not met, iOS Safari), fall back to the
 * Settings screen, where the install card shows manual steps.
 */
export function useInstallHandoff(): void {
  const { canPrompt, isInstalled, isIOS, isAndroid, promptInstall } = useInstallPrompt();

  const [requested, setRequested] = React.useState(false);
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    setRequested(hasInstallIntent());
  }, []);

  React.useEffect(() => {
    if (!requested || firedRef.current) return;

    // Already installed (or it completed mid-flow) — nothing left to do.
    if (isInstalled) {
      firedRef.current = true;
      clearInstallIntent();
      return;
    }

    if (canPrompt) {
      firedRef.current = true;
      clearInstallIntent();
      void promptInstall();
      return;
    }

    const id = window.setTimeout(() => {
      if (firedRef.current || isInstalled) return;
      if (isIOS || isAndroid) {
        firedRef.current = true;
        clearInstallIntent();
        window.location.hash = '#/settings';
      }
    }, PROMPT_WAIT_MS);
    return () => window.clearTimeout(id);
  }, [requested, canPrompt, isInstalled, isIOS, isAndroid, promptInstall]);
}
