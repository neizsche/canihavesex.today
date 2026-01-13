import * as React from 'react';
import { checkAuth, currentReturnTo } from '../lib/api';

interface AppPageGuardProps {
  children: React.ReactNode;
}

export function AppPageGuard({ children }: AppPageGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const auth = await checkAuth();
        if (!cancelled) {
          setIsAuthenticated(auth);
          if (!auth) {
            window.location.href = `/?openAuth=true&returnTo=${encodeURIComponent(currentReturnTo())}`;
          }
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          window.location.href = `/auth?returnTo=${encodeURIComponent(currentReturnTo())}`;
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthenticated === false) {
    return null; // Will redirect in useEffect
  }

  if (isAuthenticated === null) {
    // Still checking, show loading
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}