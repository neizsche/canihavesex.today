import * as React from 'react';
import { Check, Download } from 'lucide-react';
import {
  onboardingPrimaryButton,
  onboardingSecondaryButton,
  type OnboardingStepView,
} from './OnboardingFrame';

// Mirrors the signal chips on the Today screen so the app feels continuous the
// moment onboarding ends — a preview of what there is to log, not a lecture.
const SIGNALS = ['Temp', 'LH', 'Fluid', 'Calendar'];

interface ReadyStepArgs {
  onFinish: () => void;
  /** Disables the buttons and shows a spinner label while setup persists. */
  busy?: boolean;
  /** Error shown above the CTA; presence flips the label to "Try again". */
  error?: string | null;
  /** Optional "Install App" action, rendered as an outline button above the CTA. */
  secondaryCta?: { label: string; onClick: () => void } | null;
}

/**
 * Step 4 — launch. The payoff: confirmation, one expectation-setting line, and a
 * preview of the signals to log. Also the home for the optional PWA install.
 * Entrance motion is owned by the frame, so the whole block settles in together.
 */
export function readyStep({
  onFinish,
  busy = false,
  error = null,
  secondaryCta = null,
}: ReadyStepArgs): OnboardingStepView {
  return {
    contentClassName: 'gap-8 text-center',
    content: (
      <>
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0a84ff]/10">
            <Check className="h-8 w-8 text-[#007aff] dark:text-[#0a84ff]" strokeWidth={2.5} />
          </div>
          <div className="space-y-3">
            <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.045em] text-zinc-900 dark:text-white">
              You&apos;re all set.
            </h1>
            <p className="mx-auto max-w-[300px] text-[16px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Log whatever you can each day — the more you share, the sharper your window gets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {SIGNALS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border/40 bg-card px-3.5 py-1.5 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200"
            >
              {s}
            </span>
          ))}
        </div>
      </>
    ),
    footer: (
      <>
        {error && (
          <p className="text-center text-[15px] text-red-500" role="alert">
            {error}
          </p>
        )}
        {secondaryCta && (
          <button
            onClick={secondaryCta.onClick}
            disabled={busy}
            className={onboardingSecondaryButton}
          >
            <Download className="h-5 w-5" strokeWidth={2.25} />
            {secondaryCta.label}
          </button>
        )}
        <button onClick={onFinish} disabled={busy} className={onboardingPrimaryButton}>
          {busy ? 'Setting up…' : error ? 'Try again' : 'Get started'}
        </button>
      </>
    ),
  };
}
