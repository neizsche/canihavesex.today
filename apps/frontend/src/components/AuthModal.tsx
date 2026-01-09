import * as React from 'react';
import { X, Mail } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type StatusTone = 'muted' | 'danger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
}

function getApiBase(): string {
  // Astro exposes PUBLIC_ env vars to the client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = import.meta.env;
  return (env.PUBLIC_API_BASE || 'http://localhost:8787').replace(/\/$/, '');
}

export function AuthModal({ isOpen, onClose, returnTo = '/' }: AuthModalProps) {
  const [status, setStatus] = React.useState<string>('');
  const [statusTone, setStatusTone] = React.useState<StatusTone>('muted');
  const [busy, setBusy] = React.useState(false);

  const apiBase = React.useMemo(() => getApiBase(), []);

  function startGoogleOauth() {
    const url = `${apiBase}/api/auth/oauth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    location.href = url;
  }

  React.useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch(`${apiBase}/api/chart`, { credentials: 'include' });
        if (cancelled) return;
        if (res.status !== 401) {
          onClose();
          location.href = returnTo;
        }
      } catch {
        // ignore
      }
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, [apiBase, returnTo, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md">
        <Card className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              This app uses a cookie session. No predictions. No calendars. If uncertain: assume fertile.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Disclaimer:</span> This is not medical advice. This does not guarantee pregnancy prevention.
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start"
              onClick={() => {
                setBusy(true);
                setStatus('');
                startGoogleOauth();
              }}
              disabled={busy}
            >
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </span>
              Continue with Google
            </Button>

            {status ? (
              <div
                className={
                  statusTone === 'danger'
                    ? 'text-sm text-[hsl(var(--risk-high))]'
                    : 'text-sm text-muted-foreground'
                }
                role="status"
              >
                {status}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}