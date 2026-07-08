import * as React from 'react';
import { HERO } from '@/lib/siteConfig';
import { ShieldCheck } from 'lucide-react';
import { Spinner } from '@/components/common/ui/spinner';
import { SignInPageForm } from './SignInPageForm';
import { useSignIn } from './useSignIn';

interface SignInPageProps {
  returnTo?: string;
}

export function SignInPage({ returnTo = '/app#/today' }: SignInPageProps) {
  const {
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
    setStatus,
    startDemo,
    handleEmailSubmit,
    handleVerifySubmit,
    resendCode,
    startGoogleOauth,
  } = useSignIn({ returnTo });

  const getItemStyle = (index: number) => ({
    animationDelay: `${0.08 + index * 0.06}s`,
    animationFillMode: 'both' as const,
  });

  const inputClass =
    'w-full h-14 px-4 rounded-xl bg-card text-[16px] text-foreground placeholder:text-muted-foreground ' +
    'border border-[var(--input)] outline-none transition-colors duration-200 ' +
    'focus:border-accent focus:ring-2 focus:ring-accent/30';

  const heading =
    mode === 'verify'
      ? 'Check your email'
      : providers.password
        ? mode === 'signin'
          ? 'Welcome back'
          : 'Create your account'
        : 'Sign in to your account';
  const subheading =
    mode === 'verify'
      ? `Enter the 6-digit code we sent to ${email}.`
      : providers.password
        ? mode === 'signin'
          ? 'Log today. See where you are.'
          : 'One honest question, answered calmly.'
        : 'Log today. See where you are.';

  // Render loading state during active session verification or demo initialization to prevent layout flash.
  if (checkingSession || autoDemo) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-9 bg-background">
        <img
          src="/assets/logo.png"
          alt=""
          width={64}
          height={64}
          decoding="sync"
          fetchPriority="high"
          className="w-16 h-16 object-contain opacity-0 animate-slide-up-fade mix-blend-multiply dark:mix-blend-normal"
          style={{ animationFillMode: 'both' }}
        />
        <div
          className="opacity-0 animate-slide-up-fade"
          style={{ animationDelay: '0.12s', animationFillMode: 'both' }}
        >
          <Spinner size={26} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Centered brand logo element */}
            <div
              className="flex justify-center opacity-0 animate-slide-up-fade"
              style={getItemStyle(0)}
            >
              <img
                src="/assets/logo.png"
                alt="App Logo"
                width={72}
                height={72}
                decoding="sync"
                fetchPriority="high"
                className="w-[72px] h-[72px] object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </div>

            <SignInPageForm
              mode={mode}
              providers={providers}
              busy={busy}
              email={email}
              password={password}
              code={code}
              status={status}
              statusTone={statusTone}
              inputClass={inputClass}
              heading={heading}
              subheading={subheading}
              getItemStyle={getItemStyle}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onCodeChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              onEmailSubmit={handleEmailSubmit}
              onVerifySubmit={handleVerifySubmit}
              onResendCode={resendCode}
              onBackToSignIn={() => {
                setMode('signin');
                setCode('');
                setStatus('');
              }}
              onToggleMode={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setStatus('');
              }}
              onStartGoogleOauth={startGoogleOauth}
              onStartDemo={startDemo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
