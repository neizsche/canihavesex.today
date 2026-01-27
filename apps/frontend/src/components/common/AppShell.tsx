import * as React from 'react';
import { QueryCache, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { apiJson, currentReturnTo, UnauthorizedError } from '../../lib/api';
import { TodayScreen } from '../today/TodayScreen';
import { LogScreen } from '../log/LogScreen';
import { ChartScreen } from '../chart/ChartScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { BottomNav } from './BottomNav';

type RouteKey = 'today' | 'log' | 'chart' | 'settings';

function normalizeHashRoute(hash: string): RouteKey {
  // expected: "#/today", "#/log", ...
  const raw = hash.replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const first = path.split('?')[0]?.split('#')[0] ?? '/';
  if (first === '/log') return 'log';
  if (first === '/chart') return 'chart';
  if (first === '/settings') return 'settings';
  return 'today';
}

function ensureHashRoute(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/today';
  }
}

function SignedInRoutes(props: { route: RouteKey }) {
  if (props.route === 'log') return <LogScreen />;
  if (props.route === 'chart') return <ChartScreen />;
  if (props.route === 'settings') return <SettingsScreen />;
  return <TodayScreen />;
}

function redirectToAuth(): void {
  const rt = currentReturnTo();
  window.location.href = `/?openAuth=true&returnTo=${encodeURIComponent(rt)}`;
}

function SessionGate(props: { children: React.ReactNode }) {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: () => apiJson<{ userId: string; email?: string | null }>('/api/session'),
  });

  React.useEffect(() => {
    if (session.isError && session.error instanceof UnauthorizedError) {
      redirectToAuth();
    }
  }, [session.isError, session.error]);

  if (session.isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (session.isError) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Unable to connect</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            We couldn't reach the server. Please check your connection or try again.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Reload Page
        </button>
      </div>
    );
  }
  return <>{props.children}</>;
}

export function AppShell() {
  const [route, setRoute] = React.useState<RouteKey>(() =>
    typeof window === 'undefined' ? 'today' : normalizeHashRoute(window.location.hash)
  );

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

  React.useEffect(() => {
    ensureHashRoute();
    function onHashChange() {
      setRoute(normalizeHashRoute(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionGate>
        <div className="h-dvh flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          <div className="h-full max-w-lg mx-auto w-full bg-background flex flex-col overflow-hidden shadow-2xl">
            <main className="flex-1 overflow-y-auto no-scrollbar">
              <SignedInRoutes route={route} />
            </main>
            <BottomNav active={route} />
          </div>
        </div>
      </SessionGate>
    </QueryClientProvider>
  );
}
