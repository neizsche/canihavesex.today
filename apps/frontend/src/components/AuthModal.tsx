import * as React from 'react';
import { X, ShieldCheck } from 'lucide-react';

import { Button } from './ui/button';
import { getApiBase } from '../lib/api';
import { BRAND, HERO } from '../lib/siteConfig';

type StatusTone = 'muted' | 'danger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
}

export function AuthModal({ isOpen, onClose, returnTo = '/app#/today' }: AuthModalProps) {
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
    async function checkSession() {
      try {
        // Check session without auth requirement
        const res = await fetch(`${apiBase}/api/session/check`, { credentials: 'include' });
        if (cancelled) return;

        // If we get a successful response and user is authenticated, redirect to app
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            onClose();
            location.href = returnTo;
          }
        }
        // If not authenticated (401 or authenticated: false), stay on modal to show login
      } catch (err) {
        // Network error or backend unavailable - stay on modal
        console.warn('Session check failed:', err);
      }
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [apiBase, returnTo, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl border border-stone-100 relative overflow-hidden">

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4 h-8 w-8 p-0 text-stone-300 hover:text-stone-900 hover:bg-stone-50 transition-colors rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-16 h-16 mix-blend-multiply"
            />
            <div>
              <div className="text-xl font-outfit tracking-tighter text-slate-950 mb-1">
                {BRAND.PREFIX}<span className="text-red-600 font-extrabold">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
              </div>
              <p className="mt-2 text-stone-500 font-medium">
                {HERO.SUBTITLE.BEFORE}{HERO.SUBTITLE.HIGHLIGHT}{HERO.SUBTITLE.AFTER}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              className="w-full h-12 text-base font-medium bg-white text-gray-900 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-sm transition-all rounded-full"
              onClick={() => {
                setBusy(true);
                setStatus('');
                startGoogleOauth();
              }}
              disabled={busy}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100 flex items-start gap-3 text-left">
            <ShieldCheck className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-500 leading-relaxed font-medium">
              {HERO.PRIVACY_NOTE}
            </p>
          </div>

          {status ? (
            <div
              className={
                statusTone === 'danger'
                  ? 'text-sm text-red-600 bg-red-50 p-3 rounded-xl'
                  : 'text-sm text-stone-500'
              }
              role="status"
            >
              {status}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}