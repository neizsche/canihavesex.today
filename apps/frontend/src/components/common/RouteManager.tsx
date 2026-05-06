import * as React from 'react';
import { TodayScreen } from '@/components/today/TodayScreen';
import { LogScreen } from '@/components/log/LogScreen';
import { ChartScreen } from '@/components/chart/ChartScreen';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

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
  switch (route) {
    case 'log':
      return <LogScreen />;
    case 'chart':
      return <ChartScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'onboarding':
      return <OnboardingFlow onComplete={() => (window.location.hash = '#/today')} />;
    default:
      return <TodayScreen />;
  }
}
