import * as React from 'react';

/**
 * Full-screen gate shown when the device loses connectivity. The app shell is
 * served from the service worker cache so the PWA still opens offline, but its
 * data lives server-side — so rather than render a broken UI, we wait for the
 * connection. It auto-dismisses when the connection returns (see useOnlineStatus),
 * so there's no manual retry to offer.
 */
export function OfflineScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-10 text-center"
      role="alertdialog"
      aria-label="You are offline"
    >
      <div className="space-y-2">
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">No connection</h2>
        <p className="mx-auto max-w-[17rem] text-[15px] leading-relaxed text-muted-foreground">
          Please check your internet connection.
        </p>
      </div>
    </div>
  );
}
