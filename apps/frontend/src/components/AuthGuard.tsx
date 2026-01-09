import * as React from 'react';
import { checkAuth } from '../lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return fallback || (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}