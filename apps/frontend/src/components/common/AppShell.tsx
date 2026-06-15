import * as React from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { BottomNav } from './BottomNav';
import { SessionGate } from './SessionGate';
import { ThemeSync } from './ThemeSync';
import { RouteManager, useRoute } from './RouteManager';

// Static assets for preloading
import cycleImg from '@/assets/images/cards/cycle.png';
import statsImg from '@/assets/images/cards/stats.png';
import fertilityImg from '@/assets/images/cards/fertility.png';

const ASSETS_TO_PRELOAD = [cycleImg, statsImg, fertilityImg];

function redirectToAuth(): void {
  const rt = currentReturnTo();
  window.location.href = `/?openAuth=true&returnTo=${encodeURIComponent(rt)}`;
}

export function AppShell() {
  const { route } = useRoute();

  const queryClient = React.useMemo(() => {
    const cache = new QueryCache({
      onError: (err) => {
        if (err instanceof UnauthorizedError) {
          redirectToAuth();
        }
      },
    });
    return new QueryClient({
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
  }, []);

  React.useEffect(() => {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <SessionGate>
        {/* Persistent Hidden Preloader for Static Assets */}
        <div className="hidden" aria-hidden="true">
          {ASSETS_TO_PRELOAD.map((asset, idx) => (
            <img key={idx} src={asset.src} alt="" />
          ))}
        </div>

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
