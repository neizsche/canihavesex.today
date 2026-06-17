import * as React from 'react';

/**
 * Tracks browser connectivity via `navigator.onLine` and the online/offline
 * events. Note `navigator.onLine` only reflects whether the device has a network
 * interface — it can report `true` on a connection with no real internet — but
 * it's a reliable enough signal for "the connection dropped" and auto-recovers
 * when it returns.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  React.useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
