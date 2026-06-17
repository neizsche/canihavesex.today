import * as React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Full-screen gate shown when the device loses connectivity. The app shell is
 * served from the service worker cache so the PWA still opens offline, but its
 * data lives server-side — so rather than render a broken UI, we ask the user to
 * reconnect. It auto-dismisses when the connection returns (see useOnlineStatus).
 */
export function OfflineScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background px-10 text-center"
      role="alertdialog"
      aria-label="You are offline"
    >
      <WifiOff className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-2">
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">You’re offline</h2>
        <p className="mx-auto max-w-[17rem] text-[15px] leading-relaxed text-muted-foreground">
          Reconnect to pick up where you left off.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-[15px] font-semibold text-[#007aff] dark:text-[#0a84ff]"
      >
        Try again
      </button>
    </div>
  );
}
