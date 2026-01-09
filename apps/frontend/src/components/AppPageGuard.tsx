import * as React from 'react';
import { checkAuth } from '../lib/api';

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
            // Redirect to landing page
            window.location.href = '/';
          }
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          window.location.href = '/';
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