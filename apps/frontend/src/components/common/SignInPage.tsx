import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { apiFetch, getApiBase } from '@/lib/api';
import { HERO } from '@/lib/siteConfig';
import { ShieldCheck } from 'lucide-react';
import { BrandTitle } from './BrandTitle';

type StatusTone = 'muted' | 'danger';

interface SignInPageProps {
  returnTo?: string;
}

export function SignInPage({ returnTo = '/app#/today' }: SignInPageProps) {
  const [status, setStatus] = React.useState<string>('');
  const [statusTone, setStatusTone] = React.useState<StatusTone>('muted');
  const [busy, setBusy] = React.useState(false);
  // Gate the form until we know whether an existing session will redirect us
  // away. Without this, the login form flashes for already-authenticated users.
  const [checkingSession, setCheckingSession] = React.useState(true);

  const apiBase = React.useMemo(() => getApiBase(), []);

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
      // Cloud email verification: the account needs a 6-digit code before it can
      // sign in. Switch to the code step instead of redirecting. (Self-hosted
      // never returns this, so the flow is unchanged there.)
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
    const url = `${apiBase}/api/auth/oauth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    location.href = url;
  }

  async function startDemo() {
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
    } catch {
      setStatusTone('danger');
      setStatus('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await apiFetch('/api/session/check');
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            // Keep the gate up — we're navigating away, so never show the form.
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
  }, [apiBase, returnTo]);

  const reduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.08 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const inputClass =
    'w-full h-14 px-4 rounded-xl bg-card text-[16px] text-foreground placeholder:text-muted-foreground ' +
    'border border-[var(--input)] outline-none transition-colors duration-200 ' +
    'focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/30';

  const heading = mode === 'verify'
    ? 'Check your email'
    : providers.password
      ? (mode === 'signin' ? 'Welcome back' : 'Create your account')
      : 'Sign in to your account';
  const subheading = mode === 'verify'
    ? `Enter the 6-digit code we sent to ${email}.`
    : providers.password
      ? (mode === 'signin' ? 'Log today. See where you are.' : 'One honest question, answered calmly.')
      : 'Log today. See where you are.';

  // While checking for an existing session, show only the brand mark — no
  // form — so already-authenticated users redirect without a login flash.
  if (checkingSession) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex-shrink-0 pt-8 pb-4 flex items-center justify-center">
          <BrandTitle />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[400px] space-y-8"
          >
            {/* Brand mark — same logo as Today/Help, centered directly above the form */}
            <motion.div variants={itemVariants} className="flex justify-center">
              <img
                src="/logo.png"
                alt="App Logo"
                width={72}
                height={72}
                decoding="sync"
                fetchPriority="high"
                className="w-[72px] h-[72px] object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </motion.div>

            {/* Headline */}
            <motion.div variants={itemVariants} className="text-center space-y-2">
              <h1 className="text-[30px] font-bold tracking-tight text-foreground leading-tight">
                {heading}
              </h1>
              <p className="text-[16px] text-muted-foreground leading-relaxed">{subheading}</p>
            </motion.div>

            {/* Form */}
            <motion.div variants={itemVariants} className="space-y-5">
              {mode === 'verify' ? (
                <>
                  <form onSubmit={handleVerifySubmit} className="space-y-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      required
                      className={`${inputClass} text-center tracking-[0.5em] text-[20px]`}
                    />
                    <button
                      type="submit"
                      disabled={busy || code.length !== 6}
                      className="w-full h-14 rounded-xl bg-[#0a84ff] text-white font-semibold text-[17px] transition-all hover:bg-[#0070e0] active:scale-[0.98] shadow-lg shadow-[#0a84ff]/20 disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {busy ? 'Verifying…' : 'Verify email'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={busy}
                    className="w-full text-[14px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Didn't get it? Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setCode('');
                      setStatus('');
                    }}
                    className="w-full text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to sign in
                  </button>
                </>
              ) : providers.password ? (
                <>
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      required
                      className={inputClass}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                      minLength={8}
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full h-14 rounded-xl bg-[#0a84ff] text-white font-semibold text-[17px] transition-all hover:bg-[#0070e0] active:scale-[0.98] shadow-lg shadow-[#0a84ff]/20 disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {busy
                        ? mode === 'signin'
                          ? 'Signing in…'
                          : 'Creating account…'
                        : mode === 'signin'
                          ? 'Sign in'
                          : 'Create account'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                      setStatus('');
                    }}
                    className="w-full text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {mode === 'signin'
                      ? "Don't have an account? Create one"
                      : 'Already have an account? Sign in'}
                  </button>

                  {providers.google && (
                    <div className="space-y-5 pt-1">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-[var(--input)]" />
                        <span className="text-[12px] text-muted-foreground">or</span>
                        <div className="h-px flex-1 bg-[var(--input)]" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBusy(true);
                          setStatus('');
                          startGoogleOauth();
                        }}
                        disabled={busy}
                        className="w-full h-14 rounded-xl bg-card text-foreground font-semibold text-[16px] border border-[var(--input)] transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {providers.google ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBusy(true);
                        setStatus('');
                        startGoogleOauth();
                      }}
                      disabled={busy}
                      className="w-full h-14 rounded-xl bg-card text-foreground font-semibold text-[16px] border border-[var(--input)] transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  ) : (
                    <div className="text-[14px] text-[var(--destructive)] text-center font-medium py-4">
                      No sign-in methods are configured in this environment.
                    </div>
                  )}
                </div>
              )}

              {providers.demo && mode !== 'verify' && (
                <button
                  type="button"
                  onClick={startDemo}
                  disabled={busy}
                  className="w-full text-[14px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:pointer-events-none"
                >
                  Just looking? Explore the demo →
                </button>
              )}

              {/* Status */}
              <AnimatePresence>
                {status && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={
                      statusTone === 'danger'
                        ? 'text-[14px] text-[var(--destructive)] text-center font-medium'
                        : 'text-[14px] text-muted-foreground text-center'
                    }
                    role="status"
                  >
                    {status}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Privacy line — calm, single line, never a sales pitch */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="flex-shrink-0 pb-8 px-6 flex items-center justify-center gap-2 text-muted-foreground"
      >
        <ShieldCheck className="w-4 h-4" strokeWidth={2.25} />
        <span className="text-[13px]">{HERO.PRIVACY_NOTE}</span>
      </motion.div>
    </div>
  );
}
