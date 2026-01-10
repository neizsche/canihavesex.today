import * as React from 'react';
import { X, Mail } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { getApiBase } from '../lib/api';

type StatusTone = 'muted' | 'danger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
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
        const res = await fetch(`${apiBase}/api/session`, { credentials: 'include' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md">
        <Card className="relative shadow-2xl border-0 bg-gradient-to-br from-background to-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 h-8 w-8 p-0 hover:bg-muted/50 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Sign in to access your fertility insights
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button
              type="button"
              className="h-14 w-full text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
              onClick={() => {
                setBusy(true);
                setStatus('');
                startGoogleOauth();
              }}
              disabled={busy}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">
                  Privacy Policy
                </a>
              </p>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  For personalized medical advice, consult healthcare professionals.
                </p>
              </div>
            </div>

            {status ? (
              <div
                className={
                  statusTone === 'danger'
                    ? 'text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200'
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