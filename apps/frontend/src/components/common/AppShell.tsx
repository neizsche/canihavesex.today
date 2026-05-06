import * as React from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { BottomNav } from './BottomNav';
import { SessionGate } from './SessionGate';
import { RouteManager, useRoute } from './RouteManager';

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
          staleTime: 15_000,
        },
      },
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
