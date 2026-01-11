import * as React from 'react';
import { Trash2, RotateCcw, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { apiFetch, currentReturnTo } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const session = queryClient.getQueryData<{ userId: string; email?: string | null }>(['session']) ?? null;
  const [status, setStatus] = React.useState<string>('');
  const [statusTone, setStatusTone] = React.useState<'muted' | 'danger' | 'ok'>('muted');
  const [sessionState, setSessionState] = React.useState<'signedIn' | 'signedOut'>('signedIn');
  const [busy, setBusy] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('theme');
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const aboutDialogRef = React.useRef<HTMLDialogElement | null>(null);
  const [aboutView, setAboutView] = React.useState<'about' | 'privacy' | 'terms' | 'how' | 'limits' | 'disclaimer'>(
    'about'
  );

  function applyTheme(next: 'light' | 'dark') {
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    } catch {
      // ignore
    }
  }

  // This screen is rendered inside AppShell's SessionGate, so an extra /session probe is redundant.

  function openAbout(view: 'about' | 'privacy' | 'terms' | 'how' | 'limits' | 'disclaimer') {
    setAboutView(view);
    aboutDialogRef.current?.showModal();
  }

  function closeAbout() {
    aboutDialogRef.current?.close();
  }

  async function resetCycle() {
    if (!confirm('Reset cycle?\n\nThis cannot be undone.')) return;
    setBusy(true);
    setStatusTone('muted');
    setStatus('Resetting…');
    try {
      const res = await apiFetch('/reset-cycle', { method: 'POST' });
      if (res.status === 401) {
        location.href = `/auth?returnTo=${encodeURIComponent(currentReturnTo())}`;
        return;
      }
      setStatusTone(res.ok ? 'ok' : 'danger');
      setStatus(res.ok ? 'Cycle reset.' : 'Reset failed.');
      setBusy(false);
    } catch {
      setStatusTone('danger');
      setStatus('Network error.');
      setBusy(false);
    }
  }

  async function deleteAll() {
    if (!confirm('Delete all data?\n\nThis cannot be undone.')) return;
    setBusy(true);
    setStatusTone('muted');
    setStatus('Deleting…');
    try {
      const res = await apiFetch('/delete-all-data', { method: 'POST' });
      if (res.status === 401) {
        location.href = `/auth?returnTo=${encodeURIComponent(currentReturnTo())}`;
        return;
      }
      setStatusTone(res.ok ? 'ok' : 'danger');
      setStatus(res.ok ? 'All data deleted.' : 'Delete failed.');
      setBusy(false);
    } catch {
      setStatusTone('danger');
      setStatus('Network error.');
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setStatusTone('muted');
    setStatus('Signing out…');
    try {
      const res = await apiFetch('/logout', { method: 'POST' });
      setStatusTone(res.ok ? 'ok' : 'danger');
      setStatus(res.ok ? 'Signed out.' : 'Sign out failed.');
      setBusy(false);
      setSessionState('signedOut');
      if (res.ok) {
        // Drop any cached signed-in data so the SPA can't "feel" logged in.
        queryClient.clear();
        // Redirect to landing page after successful logout
        window.location.href = '/';
      }
    } catch {
      setStatusTone('danger');
      setStatus('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">Settings</div>
        <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
        <p className="text-sm text-muted-foreground">Minimal by design. Safety-first defaults.</p>
      </header>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Account & data</CardTitle>
          <CardDescription className="text-sm">
            {sessionState === 'signedIn' ? 'Session active on this device.' : 'Not signed in.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {session?.email ? (
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</div>
              <div className="mt-1 text-sm font-medium text-foreground">{session.email}</div>
            </div>
          ) : null}

          {sessionState !== 'signedIn' ? (
            <Button asChild className="h-11" disabled={busy}>
              <a href={`/auth?returnTo=${encodeURIComponent(currentReturnTo())}`}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={logout} disabled={busy}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Appearance</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={theme === 'light' ? 'default' : 'outline'}
                className="h-11 w-full justify-start"
                onClick={() => applyTheme('light')}
                disabled={busy}
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="h-11 w-full justify-start"
                onClick={() => applyTheme('dark')}
                disabled={busy}
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>

          <Separator />

          <div className="text-sm font-medium">Data</div>
          <div className="text-xs text-muted-foreground">If sharing your device, sign out before using reset/delete.</div>

          <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={resetCycle} disabled={busy}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset cycle
          </Button>

          <div className="text-xs text-muted-foreground">This cannot be undone.</div>

          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full justify-start"
            onClick={deleteAll}
            disabled={busy}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete all data
          </Button>

          <div className="text-xs text-muted-foreground">This cannot be undone.</div>

          {status ? (
            <div
              className={
                statusTone === 'danger'
                  ? 'text-sm text-[hsl(var(--risk-high))]'
                  : statusTone === 'ok'
                    ? 'text-sm text-[hsl(var(--risk-low))]'
                    : 'text-sm text-muted-foreground'
              }
              role="status"
            >
              {status}
            </div>
          ) : null}

          <Separator />
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">About & legal</CardTitle>
          <CardDescription className="text-sm">Transparency, privacy, and usage terms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={() => openAbout('about')} disabled={busy}>
            About
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={() => openAbout('privacy')} disabled={busy}>
            Privacy
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={() => openAbout('terms')} disabled={busy}>
            Terms
          </Button>

          <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={() => openAbout('how')} disabled={busy}>
            How this works
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={() => openAbout('limits')} disabled={busy}>
            What this app can and can’t do
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-start"
            onClick={() => openAbout('disclaimer')}
            disabled={busy}
          >
            Medical disclaimer
          </Button>
        </CardContent>
      </Card>


      <dialog
        ref={aboutDialogRef}
        className="w-[min(92vw,420px)] rounded-xl border bg-card p-0 text-foreground shadow-xl"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">About & legal</div>
              <div className="text-base font-semibold">
                {aboutView === 'about'
                  ? 'About'
                  : aboutView === 'privacy'
                    ? 'Privacy'
                    : aboutView === 'terms'
                      ? 'Terms'
                      : aboutView === 'how'
                        ? 'How this works'
                        : aboutView === 'limits'
                          ? 'What this app can and can’t do'
                          : 'Medical disclaimer'}
              </div>
            </div>
            <Button type="button" variant="outline" className="h-9" onClick={closeAbout}>
              Close
            </Button>
          </div>

          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            {aboutView === 'about' ? (
              <>
                <p className="text-foreground">We don’t guess. We read your body.</p>
                <p>
                  canihavesex.today is a signal-based fertility awareness tool. It summarizes your logged observations and
                  stays conservative.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>No predictions</li>
                  <li>No tracking</li>
                  <li>No false safety</li>
                </ul>
                <p>
                  Contact:{' '}
                  <a href="mailto:support@canihavesex.today" className="underline underline-offset-4">
                    support@canihavesex.today
                  </a>
                </p>
              </>
            ) : null}

            {aboutView === 'privacy' ? (
              <>
                <p>No analytics, no third-party sharing.</p>
                <p>Only stores cycle logs and auth needed to run the app.</p>
                <p>“Delete All Data” is available in Settings.</p>
                <p>No ads, no profiling.</p>
              </>
            ) : null}

            {aboutView === 'terms' ? (
              <>
                <p>This app provides fertility awareness information.</p>
                <p>For medical decisions, consult healthcare professionals.</p>
              </>
            ) : null}

            {aboutView === 'how' ? (
              <>
                <p>
                  This app uses only your logged observations (mucus, sensation, bleeding, temperature, LH) and the
                  current cycle state derived from those logs.
                </p>
                <p>
                  Output is intentionally conservative. If data is missing or uncertain, the result should be treated as
                  higher risk.
                </p>
              </>
            ) : null}

            {aboutView === 'limits' ? (
              <ul className="list-disc space-y-1 pl-5">
                <li>No prediction.</li>
                <li>No calendar views or “safe days”.</li>
                <li>No fertile window estimation.</li>
                <li>No guarantees. If uncertain, assume fertile.</li>
              </ul>
            ) : null}

            {aboutView === 'disclaimer' ? (
              <>
                <div className="space-y-4">
                  <p className="text-foreground leading-relaxed">
                    This app provides fertility awareness information using established natural family planning methods.
                    It helps you track and understand your fertility patterns based on biological signs.
                  </p>

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Important Notes</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Not a form of birth control or contraception</li>
                      <li>• Does not guarantee pregnancy prevention</li>
                      <li>• Not medical advice or diagnosis</li>
                      <li>• Results depend on correct usage</li>
                    </ul>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed">
                    For medical decisions, clinical guidance, or contraception, consult qualified healthcare professionals.
                    This tool is designed to provide information, not replace professional medical care.
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-4">
            <Button type="button" className="h-11 w-full" onClick={closeAbout}>
              Done
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
