import * as React from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';

type StatusTone = 'muted' | 'danger';

export function SignInPageForm({
  mode,
  providers,
  busy,
  email,
  password,
  code,
  status,
  statusTone,
  inputClass,
  heading,
  subheading,
  itemVariants,
  onEmailChange,
  onPasswordChange,
  onCodeChange,
  onEmailSubmit,
  onVerifySubmit,
  onResendCode,
  onBackToSignIn,
  onToggleMode,
  onStartGoogleOauth,
}: {
  mode: 'signin' | 'signup' | 'verify';
  providers: {
    password: boolean;
    google: boolean;
    oidc: boolean;
    demo: boolean;
  };
  busy: boolean;
  email: string;
  password: string;
  code: string;
  status: string;
  statusTone: StatusTone;
  inputClass: string;
  heading: string;
  subheading: string;
  itemVariants: Variants;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onEmailSubmit: (e: React.FormEvent) => void;
  onVerifySubmit: (e: React.FormEvent) => void;
  onResendCode: () => void;
  onBackToSignIn: () => void;
  onToggleMode: () => void;
  onStartGoogleOauth: () => void;
}) {
  return (
    <>
      <motion.div variants={itemVariants} className="text-center space-y-2">
        <h1 className="text-[30px] font-bold tracking-tight text-foreground leading-tight">
          {heading}
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed">{subheading}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-5">
        {mode === 'verify' ? (
          <>
            <form onSubmit={onVerifySubmit} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
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
              onClick={onResendCode}
              disabled={busy}
              className="w-full text-[14px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              Didn't get it? Resend code
            </button>
            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to sign in
            </button>
          </>
        ) : providers.password ? (
          <>
            <form onSubmit={onEmailSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
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
              onClick={onToggleMode}
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
                <GoogleButton busy={busy} onClick={onStartGoogleOauth} />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {providers.google ? (
              <GoogleButton busy={busy} onClick={onStartGoogleOauth} />
            ) : (
              <div className="text-[14px] text-[var(--destructive)] text-center font-medium py-4">
                No sign-in methods are configured in this environment.
              </div>
            )}
          </div>
        )}

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
    </>
  );
}

function GoogleButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
}
