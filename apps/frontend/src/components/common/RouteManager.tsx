import * as React from 'react';
import { TodayScreen } from '@/components/today/TodayScreen';
import { LogScreen } from '@/components/log/LogScreen';
import { ChartScreen } from '@/components/chart/ChartScreen';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { Paywall } from '@/components/billing/Paywall';
import { useBillingStatus } from '@/hooks/queries/useBillingStatus';

export type RouteKey = 'today' | 'log' | 'chart' | 'settings' | 'onboarding';

function normalizeHashRoute(hash: string): RouteKey {
  const raw = hash.replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const first = path.split('?')[0]?.split('#')[0] ?? '/';

  if (first === '/log') return 'log';
  if (first === '/chart') return 'chart';
  if (first === '/settings') return 'settings';
  if (first === '/onboarding') return 'onboarding';
  return 'today';
}

function ensureHashRoute(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/today';
  }
}

export function useRoute() {
  const [route, setRoute] = React.useState<RouteKey>(() =>
    typeof window === 'undefined' ? 'today' : normalizeHashRoute(window.location.hash)
  );

  React.useEffect(() => {
    ensureHashRoute();
    function onHashChange() {
      setRoute(normalizeHashRoute(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (newRoute: RouteKey) => {
    window.location.hash = `#/${newRoute}`;
  };

  return { route, navigate };
}

export function RouteManager({ route }: { route: RouteKey }) {
  const { data: billing } = useBillingStatus();
  // Block the whole app when billing is on and the user is no longer entitled
  // (trial expired or no plan). The Paywall replaces every screen — the bottom
  // nav is also hidden (see AppShell) — so subscribing or signing out are the
  // only ways forward. The backend gate enforces the same on /api/v1/logs and
  // /api/v1/insights (402); /api/v1/user/* stays open for data export/delete.
  const blocked = billing?.billingEnabled === true && billing.entitled === false;
  if (blocked) {
    return <Paywall state={billing.state} />;
  }

  switch (route) {
    case 'log':
      return <LogScreen />;
    case 'chart':
      return <ChartScreen />;
    case 'settings':
      return <SettingsScreen />;
    // 'onboarding' is owned by SessionGate (rendered before the app chrome),
    // so it falls through to Today here.
    default:
      return <TodayScreen />;
  }
}
