import * as React from 'react';
import { QueryCache, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { apiJson, currentReturnTo, UnauthorizedError } from '../lib/api';
import { TodayScreen } from './TodayScreen';
import { LogScreen } from './LogScreen';
import { ChartScreen } from './ChartScreen';
import { SettingsScreen } from './SettingsScreen';
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

  if (session.isError) return null;
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
        <SignedInRoutes route={route} />
        <BottomNav active={route} />
      </SessionGate>
    </QueryClientProvider>
  );
}

