import * as React from 'react';
import { OnboardingSkipLink } from './OnboardingSkipLink';

interface OnboardingScopeConsentProps {
  onContinue: () => void;
  onSkip?: () => void;
  skipBusy?: boolean;
}

export function OnboardingScopeConsent({
  onContinue,
  onSkip,
  skipBusy,
}: OnboardingScopeConsentProps) {
  return (
    <div className="flex h-full flex-col bg-background px-6 font-sans">
      {/* Hero — centered in the available space, shrinks gracefully on short screens. */}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-8 overflow-y-auto py-4 text-center">
        <div className="short-hide flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center transition-transform duration-500 hover:scale-105">
              <img
                src="/logo.png"
                alt="App Logo"
                decoding="sync"
                fetchPriority="high"
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em] text-zinc-900 dark:text-zinc-100">
            Daily fertility <br />
            made simple.
          </h2>

          <p className="px-4 text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Track your cycle, understand your body, and get clear fertility estimates every day.
          </p>
        </div>
      </div>

      {/* Pinned footer — primary action always sits in the same spot. */}
      <div className="onboarding-footer space-y-4">
        <button
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-[#007aff] text-[17px] font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-[#0051d5] active:scale-[0.98]"
        >
          Get Started
        </button>

        {onSkip && <OnboardingSkipLink onClick={onSkip} disabled={skipBusy} />}

        <p className="mx-auto max-w-[280px] text-[13px] font-medium leading-relaxed text-zinc-400 dark:text-zinc-500">
          This app provides estimates based on your data. It does not provide medical advice or
          birth control.
        </p>
      </div>
    </div>
  );
}
