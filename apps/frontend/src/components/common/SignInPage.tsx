import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { HERO } from '@/lib/siteConfig';
import { ShieldCheck } from 'lucide-react';
import { BrandTitle } from './BrandTitle';
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
    handleEmailSubmit,
    handleVerifySubmit,
    resendCode,
    startGoogleOauth,
  } = useSignIn({ returnTo });

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

  // While checking for an existing session — or running the ?demo=1 handshake —
  // show only the brand mark, no form, so users redirect without a login flash.
  if (checkingSession || autoDemo) {
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
              itemVariants={itemVariants}
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
              onStartGoogleOauth={() => {
                setBusy(true);
                setStatus('');
                startGoogleOauth();
              }}
            />
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
