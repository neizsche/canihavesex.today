import * as React from 'react';

import { subscribe, getDeferredPrompt, promptInstall } from '@/lib/pwaInstall';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari exposes installed state here instead of via display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPhoneOrPad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports a desktop Mac UA; detect it via touch support.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iPhoneOrPad || iPadOS;
}

/**
 * Surfaces PWA install state for the UI.
 *
 * - `canPrompt`  — a native install prompt is available (Chromium browsers).
 * - `isInstalled`— already running as an installed PWA; hide install affordances.
 * - `isIOS`      — iOS Safari, which has no native prompt; show manual steps.
 */
export function useInstallPrompt() {
  const deferred = React.useSyncExternalStore(
    subscribe,
    () => getDeferredPrompt(),
    () => null
  );

  const [isInstalled, setIsInstalled] = React.useState(isStandaloneDisplay);

  React.useEffect(() => {
    const onInstalled = () => setIsInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const isIOS = React.useMemo(() => isIOSDevice(), []);

  return {
    canPrompt: deferred != null,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
