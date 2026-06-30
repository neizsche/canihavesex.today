import * as React from 'react';

import {
  subscribe,
  getDeferredPrompt,
  promptInstall,
  isStandaloneDisplay,
  usedPwaRecently,
} from '@/lib/pwaInstall';

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPhoneOrPad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports a desktop Mac UA; detect it via touch support.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iPhoneOrPad || iPadOS;
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Surfaces PWA install state for the UI.
 *
 * - `canPrompt`  — a native install prompt is available (Chromium browsers).
 * - `isInstalled`— running as an installed PWA now, or launched from one within
 *                  the last 30 days; hide install affordances either way.
 * - `isIOS`      — iOS Safari, which has no native prompt; show manual steps.
 * - `isAndroid`  — Android; show manual steps when the native prompt hasn't fired
 *                  (Chrome's engagement heuristics can delay or suppress it).
 */
export function useInstallPrompt() {
  const deferred = React.useSyncExternalStore(
    subscribe,
    () => getDeferredPrompt(),
    () => null
  );

  const [isInstalled, setIsInstalled] = React.useState(
    () => isStandaloneDisplay() || usedPwaRecently()
  );

  React.useEffect(() => {
    const onInstalled = () => setIsInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const isIOS = React.useMemo(() => isIOSDevice(), []);
  const isAndroid = React.useMemo(() => isAndroidDevice(), []);

  return {
    canPrompt: deferred != null,
    isInstalled,
    isIOS,
    isAndroid,
    promptInstall,
  };
}
