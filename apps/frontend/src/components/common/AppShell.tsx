import * as React from 'react';
import { hydrate, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { BottomNav } from './BottomNav';
import { SessionGate } from './SessionGate';
import { ThemeSync } from './ThemeSync';
import { OfflineScreen } from './OfflineScreen';
import { RouteManager, useRoute } from './RouteManager';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useInstallHandoff } from '@/hooks/useInstallHandoff';

function redirectToAuth(): void {
  const rt = currentReturnTo();
  window.location.href = `/?openAuth=true&returnTo=${encodeURIComponent(rt)}`;
}

// Shared localStorage key for the persisted query cache. Used both by the
// persister (writes) and by the synchronous restore below (reads) so they
// agree on the same blob.
const PERSIST_KEY = 'chs-query-cache';
const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Rehydrate the query cache from localStorage *synchronously*, before the first
// render. The persister's own restore runs in a post-mount effect, which is too
// late: the session query has already mounted empty and flashed the loading
// gate. Seeding here lets returning users paint the app instantly while the
// session revalidates in the background.
function restorePersistedCache(client: QueryClient): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const persisted = JSON.parse(raw) as {
      timestamp?: number;
      clientState?: unknown;
    };
    const fresh =
      typeof persisted.timestamp === 'number' &&
      Date.now() - persisted.timestamp < PERSIST_MAX_AGE;
    if (fresh && persisted.clientState) {
      hydrate(client, persisted.clientState);
    }
  } catch {
    // Corrupt/old cache shape — ignore and fall back to a normal fetch.
  }
}

export function AppShell() {
  const { route } = useRoute();
  const online = useOnlineStatus();

  // Bridge the landing-page "Get the app" CTA (?install=1) into the native prompt.
  useInstallHandoff();

  const queryClient = React.useMemo(() => {
    const cache = new QueryCache({
      onError: (err) => {
        if (err instanceof UnauthorizedError) {
          redirectToAuth();
        }
      },
    });
    const client = new QueryClient({
      queryCache: cache,
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          staleTime: 5 * 60 * 1000, // 5 minutes default
          gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
        },
      },
    });
    // Seed from localStorage synchronously so the first render already has the
    // last known session — no loading-gate flash for returning users.
    restorePersistedCache(client);
    return client;
  }, []);

  React.useEffect(() => {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: PERSIST_KEY,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: PERSIST_MAX_AGE,
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {!online && <OfflineScreen />}
      <SessionGate>
        <div className="h-dvh flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          <div className="h-full max-w-lg mx-auto w-full bg-background flex flex-col overflow-hidden shadow-2xl">
            <main className="flex-1 overflow-y-auto no-scrollbar">
              <RouteManager route={route} />
            </main>
            <BottomNav active={route} />
          </div>
        </div>
      </SessionGate>
    </QueryClientProvider>
  );
}
