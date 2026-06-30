import * as React from 'react';
import { apiFetch, getApiBase } from '@/lib/api';

type StatusTone = 'muted' | 'danger';

interface UseSignInOptions {
  returnTo: string;
}

export function useSignIn({ returnTo }: UseSignInOptions) {
  const [status, setStatus] = React.useState<string>('');
  const [statusTone, setStatusTone] = React.useState<StatusTone>('muted');
  const [busy, setBusy] = React.useState(false);
  // Flag to defer form rendering until active session check resolves.
  const [checkingSession, setCheckingSession] = React.useState(true);

  const apiBase = React.useMemo(() => getApiBase(), []);

  // Detect demo mode trigger from URL search parameters.
  const wantsDemo = React.useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo'),
    []
  );
  const [autoDemo, setAutoDemo] = React.useState(wantsDemo);

  const [mode, setMode] = React.useState<'signin' | 'signup' | 'verify'>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [providers, setProviders] = React.useState<{
    password: boolean;
    google: boolean;
    oidc: boolean;
    demo: boolean;
  }>({
    password: true,
    google: false,
    oidc: false,
    demo: false,
  });

  React.useEffect(() => {
    let cancelled = false;
    apiFetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setProviders(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const startDemo = React.useCallback(async () => {
    setBusy(true);
    setStatus('');
    try {
      const res = await apiFetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        location.href = returnTo;
        return;
      }
      const data = await res.json().catch(() => ({}) as any);
      setStatusTone('danger');
      setStatus(data?.message || 'The demo is unavailable right now. Please try again.');
      setAutoDemo(false);
      setCheckingSession(false);
    } catch {
      setStatusTone('danger');
      setStatus('Network error. Please try again.');
      setAutoDemo(false);
      setCheckingSession(false);
    } finally {
      setBusy(false);
    }
  }, [returnTo]);

  // Automatically trigger demo session initialization if requested via URL.
  const demoTriggered = React.useRef(false);
  React.useEffect(() => {
    if (!wantsDemo || demoTriggered.current) return;
    demoTriggered.current = true;
    void startDemo();
  }, [startDemo, wantsDemo]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}) as any);
      if (data?.needsVerification) {
        setMode('verify');
        setStatusTone('muted');
        setStatus('We sent a 6-digit code to your email.');
        return;
      }
      if (res.ok) {
        location.href = returnTo;
        return;
      }
      setStatusTone('danger');
      setStatus(data?.message || 'Something went wrong. Please try again.');
    } catch {
      setStatusTone('danger');
      setStatus('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const res = await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        location.href = returnTo;
        return;
      }
      const data = await res.json().catch(() => ({}) as any);
      setStatusTone('danger');
      setStatus(data?.message || 'That code is invalid or has expired.');
    } catch {
      setStatusTone('danger');
      setStatus('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setStatus('');
    try {
      await apiFetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatusTone('muted');
      setStatus('If that account needs verification, a new code is on its way.');
    } catch {
      setStatusTone('danger');
      setStatus('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function startGoogleOauth() {
    setBusy(true);
    setStatus('');
    const url = `${apiBase}/api/auth/oauth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    location.href = url;
  }

  React.useEffect(() => {
    if (wantsDemo) return;
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await apiFetch('/api/session/check');
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            location.href = returnTo;
            return;
          }
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      }
      if (!cancelled) setCheckingSession(false);
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [apiBase, returnTo, wantsDemo]);

  return {
    status,
    statusTone,
    busy,
    checkingSession,
    autoDemo,
    mode,
    email,
    password,
    code,
    providers,
    setEmail,
    setPassword,
    setCode,
    setMode,
    startDemo,
    handleEmailSubmit,
    handleVerifySubmit,
    resendCode,
    startGoogleOauth,
  };
}
